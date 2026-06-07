$adminToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2N6aG5jenI2NTVqYmZqIiwidXNlcklkIjoibW9jemhuY3pyNjU1amJmaiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODUwODQ4LCJleHAiOjE3ODE0NTU2NDh9.5-x93SFivGOzZj0S1GyGFfEm_jBUpzN5tQY8r8p747Q"
$formToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTQwbTVmNjdsbGt6emlnIiwidXNlcklkIjoibXE0MG01ZjY3bGxrenppZyIsInVzZXJuYW1lIjoiW3Rlc3RdZm9ybXVsaXN0MDIiLCJyb2xlIjoiZm9ybXVsaXN0Iiwicm9sZUlkIjpudWxsLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc4MDg1MDg0OSwiZXhwIjoxNzgxNDU1NjQ5fQ.2RXE761j794QXuTfQIXhyATw72LTZjM9moR-oRr6-C4"
$baseUrl="http://localhost:3000/api"
$results=[System.Collections.ArrayList]::new()

function Test-Api {
  param([string]$Id,[string]$Name,[string]$Method,[string]$Url,[string]$Body,[string]$Token,[int]$ExpStatus,[string]$ExpContains,[string]$ExpNotContains)
  $sw=[System.Diagnostics.Stopwatch]::StartNew()
  try {
    $h=@{}; if($Token){$h["Authorization"]="Bearer $Token"}
    $p=@{Uri=$Url;Method=$Method;ContentType="application/json";Headers=$h}
    if($Body){$p["Body"]=$Body}
    $resp=Invoke-RestMethod @p -ErrorAction Stop
    $sw.Stop()
    $rj=$resp|ConvertTo-Json -Depth 10 -Compress
    $ok=$true;$det=""
    if($ExpContains -and $rj -notmatch $ExpContains){$ok=$false;$det="not_contains:$ExpContains"}
    if($ExpNotContains -and $rj -match $ExpNotContains){$ok=$false;$det+="contains_forbidden"}
    $r=@{Id=$Id;Name=$Name;Result=$(if($ok){"PASS"}else{"FAIL"});Status="200";Time="$($sw.ElapsedMilliseconds)ms";Detail=$det}
    [void]$results.Add($r)
  } catch {
    $sw.Stop();$sc="N/A";$rb=""
    if($_.Exception.Response){
      $sc=[int]$_.Exception.Response.StatusCode
      try{$rd=[System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream());$rb=$rd.ReadToEnd();$rd.Close()}catch{}
    }
    $ok=($sc -eq $ExpStatus);$det=""
    if($ok -and $ExpContains -and $rb -notmatch $ExpContains){$ok=$false;$det="not_contains:$ExpContains"}
    if($ok -and $ExpNotContains -and $rb -match $ExpNotContains){$ok=$false;$det+="contains_forbidden"}
    if(-not $ok -and $sc -ne $ExpStatus){$det="expected:$ExpStatus got:$sc"}
    $r=@{Id=$Id;Name=$Name;Result=$(if($ok){"PASS"}else{"FAIL"});Status="$sc";Time="$($sw.ElapsedMilliseconds)ms";Detail=$det;Resp=$(if($rb.Length -gt 200){$rb.Substring(0,200)}else{$rb})}
    [void]$results.Add($r)
  }
}

# Create test material with code
$matBody = '{"name":"[test]mat-for-formula3","code":"TFM003","materialType":"herb","unit":"g","unit_price":10.5,"ratio_factor":0.18}'
$matResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $matBody
$matId = $matResp.data.id

# Create supplement material
$supBody = '{"name":"[test]sup-for-formula3","code":"TSM003","materialType":"supplement","unit":"g","unit_price":5.0,"ratio_factor":1.0}'
$supResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $supBody
$supId = $supResp.data.id

# Create test salesman
$salesBody = '{"name":"[test]sales-for-formula3","phone":"13800000003"}'
$salesResp = Invoke-RestMethod -Uri "$baseUrl/salesmen" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $salesBody
$salesId = $salesResp.data.id

# F01 POST /api/formulas - Create formula
# herb: (400/100)*0.18=0.72, supplement: (30/100)*1.0=0.30, total=1.02
$formulaBody = '{"name":"[test]formula3","salesmanId":"'+$salesId+'","materials":[{"materialId":"'+$matId+'","quantity":400,"materialType":"herb"},{"materialId":"'+$supId+'","quantity":30,"materialType":"supplement"}],"finishedWeight":100,"ratioFactor":0.18,"supplementRatioFactor":1.0}'
Test-Api "F01-P01" "Create formula success" POST "$baseUrl/formulas" $formulaBody $adminToken 201 "id"

# Create formula for later tests
$formResp = Invoke-RestMethod -Uri "$baseUrl/formulas" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $formulaBody
$formId = $formResp.data.id

Test-Api "F01-E01" "Create formula missing name" POST "$baseUrl/formulas" ('{"salesmanId":"'+$salesId+'","materials":[{"materialId":"'+$matId+'","quantity":400,"materialType":"herb"}],"finishedWeight":100,"ratioFactor":0.18,"supplementRatioFactor":1.0}') $adminToken 400
Test-Api "F01-V01" "Create formula empty body" POST "$baseUrl/formulas" '{}' $adminToken 400
Test-Api "F01-R01" "Create formula no token" POST "$baseUrl/formulas" $formulaBody "" 401

# F02 GET /api/formulas
Test-Api "F02-P01" "List formulas success" GET "$baseUrl/formulas" "" $adminToken 200 "list"
Test-Api "F02-P02" "List formulas with pagination" GET "$baseUrl/formulas?page=1&pageSize=10" "" $adminToken 200 "pagination"
Test-Api "F02-P03" "List formulas with search" GET "$baseUrl/formulas?keyword=[test]" "" $adminToken 200
Test-Api "F02-R01" "List formulas no token" GET "$baseUrl/formulas" "" "" 401

# F03 GET /api/formulas/:id
Test-Api "F03-P01" "Get formula detail" GET "$baseUrl/formulas/$formId" "" $adminToken 200 "name"
Test-Api "F03-E01" "Get formula not found" GET "$baseUrl/formulas/nonexistent-id" "" $adminToken 404
Test-Api "F03-R01" "Get formula no token" GET "$baseUrl/formulas/$formId" "" "" 401

# F04 PUT /api/formulas/:id
Test-Api "F04-P01" "Update formula name" PUT "$baseUrl/formulas/$formId" '{"name":"[test]formula3-updated"}' $adminToken 200
Test-Api "F04-E01" "Update formula not found" PUT "$baseUrl/formulas/nonexistent-id" '{"name":"test"}' $adminToken 404
Test-Api "F04-R01" "Update formula no token" PUT "$baseUrl/formulas/$formId" '{"name":"test"}' "" 401

# F05 DELETE /api/formulas/:id
$delFormBody = '{"name":"[test]formula-to-delete3","salesmanId":"'+$salesId+'","materials":[{"materialId":"'+$matId+'","quantity":400,"materialType":"herb"},{"materialId":"'+$supId+'","quantity":30,"materialType":"supplement"}],"finishedWeight":100,"ratioFactor":0.18,"supplementRatioFactor":1.0}'
$delFormResp = Invoke-RestMethod -Uri "$baseUrl/formulas" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $delFormBody
$delFormId = $delFormResp.data.id
Test-Api "F05-P01" "Delete formula success" DELETE "$baseUrl/formulas/$delFormId" "" $adminToken 200
Test-Api "F05-E01" "Delete formula not found" DELETE "$baseUrl/formulas/nonexistent-id" "" $adminToken 404
Test-Api "F05-R01" "Delete formula no token" DELETE "$baseUrl/formulas/$formId" "" "" 401

# F06 Data isolation
$formFormBody = '{"name":"[test]formula-formulist3","salesmanId":"'+$salesId+'","materials":[{"materialId":"'+$matId+'","quantity":400,"materialType":"herb"},{"materialId":"'+$supId+'","quantity":30,"materialType":"supplement"}],"finishedWeight":100,"ratioFactor":0.18,"supplementRatioFactor":1.0}'
$formFormResp = Invoke-RestMethod -Uri "$baseUrl/formulas" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $formToken"} -Body $formFormBody
$formFormId = $formFormResp.data.id
Test-Api "F06-D01" "Formulist sees own formula" GET "$baseUrl/formulas/$formFormId" "" $formToken 200

# F07 Publish formula
Test-Api "F07-P01" "Publish formula" PUT "$baseUrl/formulas/$formId/publish" "" $adminToken 200

# F08 Get price quote
Test-Api "F08-P01" "Get price quote" GET "$baseUrl/formulas/$formId/price-quote" "" $adminToken 200

# F09 Validate ratio
Test-Api "F09-P01" "Validate ratio" POST "$baseUrl/formulas/validate-ratio" ('{"materials":[{"materialId":"'+$matId+'","quantity":400,"materialType":"herb"},{"materialId":"'+$supId+'","quantity":30,"materialType":"supplement"}],"finishedWeight":100,"ratioFactor":0.18,"supplementRatioFactor":1.0}') $adminToken 200

$pass=($results|?{$_.Result -eq "PASS"}).Count
$fail=($results|?{$_.Result -eq "FAIL"}).Count
Write-Output "FORMULAS: Total=$($results.Count) Pass=$pass Fail=$fail"
$results|%{$d=if($_.Detail){"|$($_.Detail)"}else{""};Write-Output "$($_.Id)|$($_.Name)|$($_.Result)|$($_.Status)|$($_.Time)$d"}
$results|ConvertTo-Json -Depth 5|Out-File "d:\ProgramData\workspace-codeby\ting-studio\test\api-test-results\formulas-raw.json" -Encoding utf8