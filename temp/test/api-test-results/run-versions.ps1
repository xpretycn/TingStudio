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

# V01 GET /api/formulas/:id/versions - List versions
Test-Api "V01-P01" "List versions success" GET "$baseUrl/formulas" "" $adminToken 200 "list"

# Create a formula for version testing
$matBody = '{"name":"[test]mat-for-version","code":"TVM001","materialType":"herb","unit":"g","unit_price":10.5,"ratio_factor":0.18}'
$matResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $matBody
$matId = $matResp.data.id
$supBody = '{"name":"[test]sup-for-version","code":"TSM-V01","materialType":"supplement","unit":"g","unit_price":5.0,"ratio_factor":1.0}'
$supResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $supBody
$supId = $supResp.data.id
$salesBody = '{"name":"[test]sales-for-version","phone":"13800000010"}'
$salesResp = Invoke-RestMethod -Uri "$baseUrl/salesmen" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $salesBody
$salesId = $salesResp.data.id
$formBody = '{"name":"[test]formula-version","salesmanId":"'+$salesId+'","materials":[{"materialId":"'+$matId+'","quantity":400,"materialType":"herb"},{"materialId":"'+$supId+'","quantity":30,"materialType":"supplement"}],"finishedWeight":100,"ratioFactor":0.18,"supplementRatioFactor":1.0}'
$formResp = Invoke-RestMethod -Uri "$baseUrl/formulas" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $formBody
$formId = $formResp.data.id

# V02 GET /api/formulas/:id/versions
Test-Api "V02-P01" "Get formula versions" GET "$baseUrl/formulas/$formId/versions" "" $adminToken 200
Test-Api "V02-R01" "Get versions no token" GET "$baseUrl/formulas/$formId/versions" "" "" 401

# V03 POST /api/formulas/:id/versions - Create version
Test-Api "V03-P01" "Create version success" POST "$baseUrl/formulas/$formId/versions" '{}' $adminToken 200
Test-Api "V03-R01" "Create version no token" POST "$baseUrl/formulas/$formId/versions" '{}' "" 401

# V04 GET /api/formulas/:id/versions/:versionId
$verResp = Invoke-RestMethod -Uri "$baseUrl/formulas/$formId/versions" -Method GET -Headers @{Authorization="Bearer $adminToken"}
$verId = if ($verResp.data -and $verResp.data.list -and $verResp.data.list.Count -gt 0) { $verResp.data.list[0].versionId } else { "none" }
if ($verId -ne "none") {
  Test-Api "V04-P01" "Get version detail" GET "$baseUrl/formulas/$formId/versions/$verId" "" $adminToken 200
}

Test-Api "V04-E01" "Get version not found" GET "$baseUrl/formulas/$formId/versions/nonexistent-ver" "" $adminToken 404

$pass=($results|?{$_.Result -eq "PASS"}).Count
$fail=($results|?{$_.Result -eq "FAIL"}).Count
Write-Output "VERSIONS: Total=$($results.Count) Pass=$pass Fail=$fail"
$results|%{$d=if($_.Detail){"|$($_.Detail)"}else{""};Write-Output "$($_.Id)|$($_.Name)|$($_.Result)|$($_.Status)|$($_.Time)$d"}
$results|ConvertTo-Json -Depth 5|Out-File "d:\ProgramData\workspace-codeby\ting-studio\test\api-test-results\versions-raw.json" -Encoding utf8