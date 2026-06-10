$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4ZHMzbWYyZW9rbWY5IiwidXNlcklkIjoibXEzeGRzM21mMmVva21mOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODQ1NjE1LCJleHAiOjE3ODE0NTA0MTV9.G_kc-XzzXm3YCBQmUtxMNHJ_HCASH84pb6kDo_mVI2Q"
$formulistToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4Z3FhNTh4czJ1cnZiIiwidXNlcklkIjoibXEzeGdxYTU4eHMydXJ2YiIsInVzZXJuYW1lIjoidGVzdGFkbWluIiwicm9sZSI6ImZvcm11bGlzdCIsInJvbGVJZCI6bnVsbCwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3ODA4NDU2MTUsImV4cCI6MTc4MTQ1MDQxNX0.iBO2hU_DhC2MpI3A7LCix8mP3SGLm4UGLIYUIAVXAcI"
$baseUrl = "http://localhost:3000/api"
$h = @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" }
$fh = @{ "Authorization" = "Bearer $formulistToken"; "Content-Type" = "application/json" }
$noAuth = @{ "Content-Type" = "application/json" }
$results = @()

function Test-Get($id, $name, $url, $headers, $expectStatus) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
        $sw.Stop()
        if ($expectStatus -eq 200) {
            $results += "$id|$name|PASS|200|$($sw.ElapsedMilliseconds)ms"
        } else {
            $results += "$id|$name|FAIL|200|expected $expectStatus"
        }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $expectStatus) {
            $results += "$id|$name|PASS|$code|0ms"
        } else {
            $results += "$id|$name|FAIL|$code|expected $expectStatus"
        }
    }
}

function Test-Post($id, $name, $url, $headers, $body, $expectStatus) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body
        $sw.Stop()
        if ($expectStatus -eq 200 -or $expectStatus -eq 201) {
            $results += "$id|$name|PASS|$expectStatus|$($sw.ElapsedMilliseconds)ms"
        } else {
            $results += "$id|$name|FAIL|200|expected $expectStatus"
        }
        return $r
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $expectStatus) {
            $results += "$id|$name|PASS|$code|0ms"
        } else {
            $results += "$id|$name|FAIL|$code|expected $expectStatus"
        }
        return $null
    }
}

function Test-Put($id, $name, $url, $headers, $body, $expectStatus) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method PUT -Headers $headers -Body $body
        $sw.Stop()
        if ($expectStatus -eq 200) {
            $results += "$id|$name|PASS|200|$($sw.ElapsedMilliseconds)ms"
        } else {
            $results += "$id|$name|FAIL|200|expected $expectStatus"
        }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $expectStatus) {
            $results += "$id|$name|PASS|$code|0ms"
        } else {
            $results += "$id|$name|FAIL|$code|expected $expectStatus"
        }
    }
}

function Test-Delete($id, $name, $url, $headers, $expectStatus) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method DELETE -Headers $headers
        $sw.Stop()
        if ($expectStatus -eq 200) {
            $results += "$id|$name|PASS|200|$($sw.ElapsedMilliseconds)ms"
        } else {
            $results += "$id|$name|FAIL|200|expected $expectStatus"
        }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $expectStatus) {
            $results += "$id|$name|PASS|$code|0ms"
        } else {
            $results += "$id|$name|FAIL|$code|expected $expectStatus"
        }
    }
}

# ===== AI MODULE =====
Test-Get "A05-P01" "get-models" "$baseUrl/ai/models" $h 200
Test-Get "A05-R01" "get-models-noauth" "$baseUrl/ai/models" $noAuth 401
Test-Get "A07-P01" "get-models-manage" "$baseUrl/ai/models-manage" $h 200
Test-Get "A07-R01" "get-models-manage-noauth" "$baseUrl/ai/models-manage" $noAuth 401
Test-Get "A16-P01" "get-usage" "$baseUrl/ai/usage" $h 200
Test-Get "A17-P01" "get-usage-logs" "$baseUrl/ai/usage/logs" $h 200
Test-Get "A18-P01" "get-alerts-configs" "$baseUrl/ai/alerts/configs" $h 200
Test-Get "A20-P01" "get-alerts-records" "$baseUrl/ai/alerts/records" $h 200
Test-Get "A21-P01" "get-health" "$baseUrl/ai/health" $h 200
Test-Get "A28-P01" "get-recent-activity" "$baseUrl/ai/recent-activity" $h 200
Test-Get "A29-P01" "get-smart-tool-history" "$baseUrl/ai/smart-tool-history" $h 200
Test-Get "A31-P01" "get-prompt-templates" "$baseUrl/ai/prompt-templates" $h 200
Test-Get "A35-P01" "get-parse-results" "$baseUrl/ai/parse-results" $h 200
Test-Get "A36-P01" "get-parse-statistics" "$baseUrl/ai/parse-results/statistics" $h 200
Test-Get "A37-P01" "get-parse-config" "$baseUrl/ai/parse-results/config" $h 200
Test-Get "A38-P01" "get-parse-degradation" "$baseUrl/ai/parse-results/degradation" $h 200
Test-Get "A39-P01" "get-parse-metrics" "$baseUrl/ai/parse-results/metrics" $h 200
Test-Get "A41-P01" "get-parse-performance" "$baseUrl/ai/parse-results/performance" $h 200
Test-Get "A23-P01" "admin-get-model-apps" "$baseUrl/ai/model-applications" $h 200
Test-Get "A23-E01" "formulist-get-model-apps" "$baseUrl/ai/model-applications" $fh 403
Test-Get "A40-P01" "admin-get-parse-alerts" "$baseUrl/ai/parse-results/alerts" $h 200
Test-Get "A40-E01" "formulist-get-parse-alerts" "$baseUrl/ai/parse-results/alerts" $fh 403
Test-Get "A13-P01" "get-provider-versions" "$baseUrl/ai/models/deepseek/versions" $h 200
Test-Get "A22-P01" "get-health-history" "$baseUrl/ai/health/deepseek/history" $h 200

# A08 create model
$r8 = Test-Post "A08-P01" "admin-create-model" "$baseUrl/ai/models-manage" $h '{"provider":"[test]-prov1","name":"[test]model","baseUrl":"http://localhost:3000","model":"test-model"}' 200
$testModelId = $null
if ($r8 -and $r8.success) { $testModelId = $r8.data.id }
Test-Post "A08-E01" "formulist-create-model" "$baseUrl/ai/models-manage" $fh '{"provider":"[test]-nope","name":"[test]nope","baseUrl":"http://localhost","model":"test"}' 403

# A09 update model
if ($testModelId) {
    Test-Put "A09-P01" "admin-update-model" "$baseUrl/ai/models-manage/$testModelId" $h '{"name":"[test]updated"}' 200
}
Test-Put "A09-E01" "update-nonexistent-model" "$baseUrl/ai/models-manage/nonexistent-id" $h '{"name":"test"}' 404

# A12 get versions
if ($testModelId) {
    Test-Get "A12-P01" "get-model-versions" "$baseUrl/ai/models-manage/$testModelId/versions" $h 200
}

# A10 delete model
if ($testModelId) {
    Test-Delete "A10-P01" "admin-delete-model" "$baseUrl/ai/models-manage/$testModelId" $h 200
}
Test-Delete "A10-E01" "delete-nonexistent-model" "$baseUrl/ai/models-manage/nonexistent-id" $h 404

# A32 create prompt template
$r32 = Test-Post "A32-P01" "create-prompt-template" "$baseUrl/ai/prompt-templates" $h '{"module":"smart-generate","name":"[test]template","systemPrompt":"test","userPrompt":"test"}' 200
$testTemplateId = $null
if ($r32 -and $r32.success) { $testTemplateId = $r32.data.id }
Test-Post "A32-E01" "create-template-no-module" "$baseUrl/ai/prompt-templates" $h '{"name":"test"}' 400

# A33 update template
if ($testTemplateId) {
    Test-Put "A33-P01" "update-prompt-template" "$baseUrl/ai/prompt-templates/$testTemplateId" $h '{"name":"[test]updated"}' 200
}
Test-Put "A33-E01" "update-nonexistent-template" "$baseUrl/ai/prompt-templates/nonexistent" $h '{"name":"test"}' 404

# A34 delete template
if ($testTemplateId) {
    Test-Delete "A34-P01" "delete-prompt-template" "$baseUrl/ai/prompt-templates/$testTemplateId" $h 200
}
Test-Delete "A34-E01" "delete-nonexistent-template" "$baseUrl/ai/prompt-templates/nonexistent" $h 404

# A47 save parse result
$r47 = Test-Post "A47-P01" "save-parse-result" "$baseUrl/ai/parse-results" $h '{"callType":"parse_formula","fileHash":"[test]-hash-001","fileName":"[test]test.xlsx","fileSize":1024,"parsedResult":{"name":"test","materials":[]},"rawResponse":"{}"}' 200
$testParseResultId = $null
if ($r47 -and $r47.success) { $testParseResultId = $r47.data.id }

# A48 check parse result
Test-Post "A48-P01" "check-existing-parse" "$baseUrl/ai/parse-results/check" $h '{"fileHash":"[test]-hash-001","callType":"parse_formula"}' 200
Test-Post "A48-P02" "check-nonexisting-parse" "$baseUrl/ai/parse-results/check" $h '{"fileHash":"[test]-notexist","callType":"parse_formula"}' 200

# A42 get parse result detail
if ($testParseResultId) {
    Test-Get "A42-P01" "get-parse-detail" "$baseUrl/ai/parse-results/$testParseResultId" $h 200
}
Test-Get "A42-E01" "get-nonexistent-parse" "$baseUrl/ai/parse-results/nonexistent-id" $h 404

# A52 mark used
if ($testParseResultId) {
    Test-Post "A52-P01" "mark-parse-used" "$baseUrl/ai/parse-results/$testParseResultId/mark-used" $h '{}' 200
}

# A53 delete parse result
if ($testParseResultId) {
    Test-Delete "A53-P01" "delete-parse-result" "$baseUrl/ai/parse-results/$testParseResultId" $h 200
}

# A50 cleanup
Test-Post "A50-P01" "admin-cleanup" "$baseUrl/ai/parse-results/cleanup" $h '{}' 200
Test-Post "A50-E01" "formulist-cleanup" "$baseUrl/ai/parse-results/cleanup" $fh '{}' 403

# A49 update parse config
Test-Put "A49-P01" "admin-update-parse-config" "$baseUrl/ai/parse-results/config" $h '{"storageLimit":5000}' 200
Test-Put "A49-E01" "formulist-update-parse-config" "$baseUrl/ai/parse-results/config" $fh '{"storageLimit":5000}' 403

# A19 update alert config
try {
    $ac = Invoke-RestMethod -Uri "$baseUrl/ai/alerts/configs" -Method GET -Headers $h
    if ($ac.data.configs -and $ac.data.configs.Count -gt 0) {
        $acid = $ac.data.configs[0].id
        Test-Put "A19-P01" "admin-update-alert-config" "$baseUrl/ai/alerts/configs/$acid" $h '{"dailyCallLimit":500,"warningThreshold":80}' 200
    } else {
        $results += "A19-P01|admin-update-alert-config|SKIP|0|no alert config id"
    }
} catch { $results += "A19-P01|admin-update-alert-config|FAIL|0|$($_.Exception.Message)" }
Test-Put "A19-E01" "formulist-update-alert" "$baseUrl/ai/alerts/configs/nonexistent" $fh '{"dailyCallLimit":500}' 403

# Skip AI-dependent endpoints
$results += "A01-P01|parse-formula|SKIP|0|requires AI API Key"
$results += "A02-P01|parse-material-nutrition|SKIP|0|requires AI API Key"
$results += "A03-P01|natural-search|SKIP|0|requires AI API Key"
$results += "A06-P01|chat-sse|SKIP|0|requires AI API Key"
$results += "A04-P01|export-file|SKIP|0|depends on A03"

# ===== AGENT MODULE =====
Test-Get "G04-P01" "get-agent-sessions" "$baseUrl/agent/sessions" $h 200
Test-Get "G04-E01" "get-sessions-noauth" "$baseUrl/agent/sessions" $noAuth 401
Test-Get "G07-P01" "get-role-config" "$baseUrl/agent/role-config" $h 200
Test-Get "G07-E01" "get-role-config-noauth" "$baseUrl/agent/role-config" $noAuth 401
Test-Get "G09-P01" "get-float-config" "$baseUrl/agent/float-config" $h 200
Test-Get "G09-E01" "get-float-config-noauth" "$baseUrl/agent/float-config" $noAuth 401
Test-Get "G14-P01" "get-field-hints" "$baseUrl/agent/field-hints?pageId=formula-add" $h 200
Test-Get "G15-P01" "get-agent-health" "$baseUrl/agent/health" $h 200

# G08 update role config
Test-Put "G08-P01" "update-role-config" "$baseUrl/agent/role-config" $h '{"agent_name":"[test]agent","user_title":"[test]title","tone_style":"casual"}' 200

# G10 update float config
Test-Put "G10-P01" "admin-update-float-config" "$baseUrl/agent/float-config" $h '{"enabled":true,"model":"deepseek","position":"right"}' 200
Test-Put "G10-E01" "formulist-update-float-config" "$baseUrl/agent/float-config" $fh '{"enabled":false}' 403

# Skip AI-dependent agent endpoints
$results += "G01-P01|agent-chat|SKIP|0|requires AI API Key"
$results += "G02-P01|submit-form|SKIP|0|depends on G01"
$results += "G03-P01|get-pending-form|SKIP|0|depends on G01"
$results += "G11-P01|parse-form|SKIP|0|requires AI API Key"
$results += "G12-P01|float-chat|SKIP|0|requires AI API Key"
$results += "G13-P01|generate-description|SKIP|0|requires AI API Key"

# ===== PARSE TEMPLATES MODULE =====
Test-Get "P01-P01" "get-parse-templates" "$baseUrl/parse-templates" $h 200
Test-Get "P01-E01" "get-templates-noauth" "$baseUrl/parse-templates" $noAuth 401

# P03 create template
$rP3 = Test-Post "P03-P01" "create-parse-template" "$baseUrl/parse-templates" $h '{"name":"[test]nutrition-template","category":"nutrition","defaultProvider":"deepseek","defaultModel":"deepseek-chat"}' 201
$testPTId = $null
if ($rP3 -and $rP3.success) { $testPTId = $rP3.data.id }
Test-Post "P03-E01" "create-template-no-name" "$baseUrl/parse-templates" $h '{"category":"nutrition"}' 400
Test-Post "P03-E02" "create-template-empty-name" "$baseUrl/parse-templates" $h '{"name":""}' 400

# P02 get template detail
if ($testPTId) {
    Test-Get "P02-P01" "get-template-detail" "$baseUrl/parse-templates/$testPTId" $h 200
}
Test-Get "P02-E01" "get-nonexistent-template" "$baseUrl/parse-templates/nonexistent-id" $h 404

# P04 update template
if ($testPTId) {
    Test-Put "P04-P01" "update-parse-template" "$baseUrl/parse-templates/$testPTId" $h '{"name":"[test]updated-name"}' 200
}
Test-Put "P04-E01" "update-nonexistent-template" "$baseUrl/parse-templates/nonexistent-id" $h '{"name":"test"}' 404

# P05 delete template
if ($testPTId) {
    Test-Delete "P05-P01" "delete-parse-template" "$baseUrl/parse-templates/$testPTId" $h 200
}
Test-Delete "P05-E01" "delete-nonexistent-template" "$baseUrl/parse-templates/nonexistent-id" $h 404

# ===== NUTRITION MODULE =====
# First create test material
$matBody = '{"name":"[test]mat-nutrition","code":"[test]-N001","category":"herb","unit":"g","unitPrice":10,"supplier":"test"}'
$rMat = Test-Post "NUT-SETUP" "create-test-material" "$baseUrl/materials" $h $matBody 200
$testMatId = $null
if ($rMat -and $rMat.success) { $testMatId = $rMat.data.id }

if ($testMatId) {
    # A01 GET /api/nutrition/material/:materialId
    Test-Get "A01-P01" "get-material-nutrition" "$baseUrl/nutrition/material/$testMatId" $h 200
    Test-Get "A01-R01" "get-nutrition-noauth" "$baseUrl/nutrition/material/$testMatId" $noAuth 401

    # A02 PUT /api/nutrition/material/:materialId
    Test-Put "A02-P01" "set-material-nutrition" "$baseUrl/nutrition/material/$testMatId" $h '{"per100g":{"protein":5.2,"fat":1.3,"carbohydrate":10.5,"sodium":50},"confidence":"high"}' 200
    Test-Put "A02-E01" "set-nutrition-nonexistent" "$baseUrl/nutrition/material/nonexistent-id" $h '{"per100g":{"protein":5}}' 404
    Test-Put "A02-V01" "set-nutrition-no-per100g" "$baseUrl/nutrition/material/$testMatId" $h '{"confidence":"high"}' 400

    # B01 GET /api/nutrition/material/:materialId/sources
    Test-Get "B01-P01" "get-material-sources" "$baseUrl/nutrition/material/$testMatId/sources" $h 200
    Test-Get "B01-R01" "get-sources-noauth" "$baseUrl/nutrition/material/$testMatId/sources" $noAuth 401

    # B02 POST /api/nutrition/material/:materialId/sources
    $rB2 = Test-Post "B02-P01" "add-manual-source" "$baseUrl/nutrition/material/$testMatId/sources" $h '{"sourceType":"manual","per100g":{"protein":5,"fat":2,"carbohydrate":10}}' 200
    $testSourceId = $null
    if ($rB2 -and $rB2.success) { $testSourceId = $rB2.data.sourceId }
    Test-Post "B02-E01" "add-invalid-source-type" "$baseUrl/nutrition/material/$testMatId/sources" $h '{"sourceType":"invalid","per100g":{"protein":5}}' 400

    # B03 GET compare
    Test-Get "B03-P01" "get-sources-compare" "$baseUrl/nutrition/material/$testMatId/sources/compare" $h 200

    # B04 PUT update source
    if ($testSourceId) {
        Test-Put "B04-P01" "update-source" "$baseUrl/nutrition/material/$testMatId/sources/$testSourceId" $h '{"notes":"[test]updated"}' 200
    }

    # B06 PUT authoritative
    if ($testSourceId) {
        Test-Put "B06-P01" "set-authoritative" "$baseUrl/nutrition/material/$testMatId/authoritative" $h "{\"fieldSelections\":{\"protein\":\"$testSourceId\"}}" 200
    }

    # B05 DELETE source (soft delete)
    if ($testSourceId) {
        Test-Delete "B05-P01" "delete-source" "$baseUrl/nutrition/material/$testMatId/sources/$testSourceId" $h 200
    }

    # C01 scored sources
    Test-Get "C01-P01" "get-scored-sources" "$baseUrl/nutrition/material/$testMatId/sources/scored" $h 200

    # C02 recommendation
    Test-Get "C02-P01" "get-source-recommendation" "$baseUrl/nutrition/material/$testMatId/sources/recommendation" $h 200

    # C07 snapshots
    Test-Get "C07-P01" "get-snapshots" "$baseUrl/nutrition/material/$testMatId/snapshots" $h 200

    # C06 export
    Test-Get "C06-P01" "export-sources" "$baseUrl/nutrition/material/$testMatId/sources/export" $h 200
}

# A05 GET /api/nutrition/profiles
Test-Get "A05-P01" "get-nutrition-profiles" "$baseUrl/nutrition/profiles" $h 200
Test-Get "A05-R01" "get-profiles-noauth" "$baseUrl/nutrition/profiles" $noAuth 401

# A06 POST /api/nutrition/profiles
$rA6 = Test-Post "A06-P01" "create-nutrition-profile" "$baseUrl/nutrition/profiles" $h '{"name":"[test]adult-standard","targetValues":{"protein":60,"fat":60}}' 201
$testProfileId = $null
if ($rA6 -and $rA6.success) { $testProfileId = $rA6.data.profileId }
Test-Post "A06-V01" "create-profile-no-name" "$baseUrl/nutrition/profiles" $h '{"targetValues":{"protein":60}}' 400

# A07 PUT /api/nutrition/profiles/:profileId
if ($testProfileId) {
    Test-Put "A07-P01" "update-nutrition-profile" "$baseUrl/nutrition/profiles/$testProfileId" $h '{"name":"[test]updated-standard","targetValues":{"protein":65}}' 200
}
Test-Put "A07-E01" "update-nonexistent-profile" "$baseUrl/nutrition/profiles/nonexistent-id" $h '{"name":"test"}' 404

# A08 DELETE /api/nutrition/profiles/:profileId
if ($testProfileId) {
    Test-Delete "A08-P01" "delete-nutrition-profile" "$baseUrl/nutrition/profiles/$testProfileId" $h 200
}
Test-Delete "A08-E01" "delete-nonexistent-profile" "$baseUrl/nutrition/profiles/nonexistent-id" $h 404

# Create formula for nutrition tests
$formulaBody = '{"name":"[test]formula-nutrition","code":"[test]-F001","finishedWeight":200,"materials":[]}'
$rForm = Test-Post "NUT-SETUP2" "create-test-formula" "$baseUrl/formulas" $h $formulaBody 200
$testFormulaId = $null
if ($rForm -and $rForm.success) { $testFormulaId = $rForm.data.id }

if ($testFormulaId) {
    # A03 POST /api/nutrition/calculate/:formulaId
    Test-Post "A03-P01" "calculate-nutrition" "$baseUrl/nutrition/calculate/$testFormulaId" $h '{}' 200
    Test-Post "A03-E01" "calc-nonexistent-formula" "$baseUrl/nutrition/calculate/nonexistent-id" $h '{}' 404

    # A04 GET /api/nutrition/tables/:formulaId
    Test-Get "A04-P01" "get-nutrition-tables" "$baseUrl/nutrition/tables/$testFormulaId" $h 200

    # A11 GET /api/nutrition/coverage/:formulaId
    Test-Get "A11-P01" "get-nutrition-coverage" "$baseUrl/nutrition/coverage/$testFormulaId" $h 200
}

# ===== EXCLUSIONS MODULE =====
Test-Get "D01-P01" "get-exclusions" "$baseUrl/enums/exclusions" $h 200
Test-Get "D01-R01" "get-exclusions-noauth" "$baseUrl/enums/exclusions" $noAuth 401

# D02 POST create exclusion
$rD2 = Test-Post "D02-P01" "create-exclusion" "$baseUrl/enums/exclusions" $h '{"category":"appearance","valueA":"test-val-a","valueB":"test-val-b"}' 201
$testExcId = $null
if ($rD2 -and $rD2.success) { $testExcId = $rD2.data.id }
Test-Post "D02-E01" "create-exclusion-invalid-cat" "$baseUrl/enums/exclusions" $h '{"category":"invalid","valueA":"a","valueB":"b"}' 400
Test-Post "D02-V01" "create-exclusion-no-category" "$baseUrl/enums/exclusions" $h '{"valueA":"a","valueB":"b"}' 400
Test-Post "D02-R01" "formulist-create-exclusion" "$baseUrl/enums/exclusions" $fh '{"category":"appearance","valueA":"a2","valueB":"b2"}' 403

# D03 DELETE exclusion
if ($testExcId) {
    Test-Delete "D03-P01" "delete-exclusion" "$baseUrl/enums/exclusions/$testExcId" $h 200
}
Test-Delete "D03-E01" "delete-nonexistent-exclusion" "$baseUrl/enums/exclusions/nonexistent-id" $h 404
Test-Delete "D03-R01" "formulist-delete-exclusion" "$baseUrl/enums/exclusions/nonexistent-id" $fh 403

# ===== RATIO THRESHOLDS MODULE =====
Test-Get "E01-P01" "get-ratio-thresholds" "$baseUrl/ratio-thresholds" $h 200
Test-Get "E01-R01" "get-thresholds-noauth" "$baseUrl/ratio-thresholds" $noAuth 401

# E02 PUT update thresholds
Test-Put "E02-P01" "update-ratio-thresholds" "$baseUrl/ratio-thresholds" $h '{"normalLow":0.97,"normalHigh":1.03,"warningLow":0.94,"warningHigh":1.06,"highWarningLow":0.91,"highWarningHigh":1.09}' 200
Test-Put "E02-E01" "update-thresholds-invalid" "$baseUrl/ratio-thresholds" $h '{"normalLow":1.03,"normalHigh":0.97,"warningLow":0.94,"warningHigh":1.06,"highWarningLow":0.91,"highWarningHigh":1.09}' 400
Test-Put "E02-R01" "formulist-update-thresholds" "$baseUrl/ratio-thresholds" $fh '{"normalLow":0.97,"normalHigh":1.03,"warningLow":0.94,"warningHigh":1.06,"highWarningLow":0.91,"highWarningHigh":1.09}' 403

# Reset thresholds
Test-Put "E02-CLEANUP" "reset-ratio-thresholds" "$baseUrl/ratio-thresholds" $h '{"normalLow":0.98,"normalHigh":1.02,"warningLow":0.95,"warningHigh":1.05,"highWarningLow":0.92,"highWarningHigh":1.08}' 200

# Output all results
$results | ForEach-Object { Write-Output $_ }
