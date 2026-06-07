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

# S01 POST /api/salesmen - Create salesman
Test-Api "S01-P01" "Create salesman success" POST "$baseUrl/salesmen" '{"name":"[test]sales1","phone":"13800000011"}' $adminToken 201 "id"
$salesResp = Invoke-RestMethod -Uri "$baseUrl/salesmen" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body '{"name":"[test]sales-for-detail","phone":"13800000012"}'
$salesId = $salesResp.data.id

Test-Api "S01-E01" "Create salesman missing name" POST "$baseUrl/salesmen" '{"phone":"13800000013"}' $adminToken 400
Test-Api "S01-V01" "Create salesman empty body" POST "$baseUrl/salesmen" '{}' $adminToken 400
Test-Api "S01-R01" "Create salesman no token" POST "$baseUrl/salesmen" '{"name":"[test]sales1","phone":"13800000014"}' "" 401

# S02 GET /api/salesmen - List salesmen
Test-Api "S02-P01" "List salesmen success" GET "$baseUrl/salesmen" "" $adminToken 200 "list"
Test-Api "S02-P02" "List salesmen with pagination" GET "$baseUrl/salesmen?page=1&pageSize=10" "" $adminToken 200 "pagination"
Test-Api "S02-R01" "List salesmen no token" GET "$baseUrl/salesmen" "" "" 401

# S03 GET /api/salesmen/:id - Get salesman detail
Test-Api "S03-P01" "Get salesman detail" GET "$baseUrl/salesmen/$salesId" "" $adminToken 200 "name"
Test-Api "S03-E01" "Get salesman not found" GET "$baseUrl/salesmen/nonexistent-id" "" $adminToken 404
Test-Api "S03-R01" "Get salesman no token" GET "$baseUrl/salesmen/$salesId" "" "" 401

# S04 PUT /api/salesmen/:id - Update salesman
Test-Api "S04-P01" "Update salesman name" PUT "$baseUrl/salesmen/$salesId" '{"name":"[test]sales1-updated"}' $adminToken 200
Test-Api "S04-E01" "Update salesman not found" PUT "$baseUrl/salesmen/nonexistent-id" '{"name":"test"}' $adminToken 404
Test-Api "S04-R01" "Update salesman no token" PUT "$baseUrl/salesmen/$salesId" '{"name":"test"}' "" 401

# S05 DELETE /api/salesmen/:id - Delete salesman
$delSalesResp = Invoke-RestMethod -Uri "$baseUrl/salesmen" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body '{"name":"[test]sales-to-delete","phone":"13800000020"}'
$delSalesId = $delSalesResp.data.id
Test-Api "S05-P01" "Delete salesman success" DELETE "$baseUrl/salesmen/$delSalesId" "" $adminToken 200
Test-Api "S05-E01" "Delete salesman not found" DELETE "$baseUrl/salesmen/nonexistent-id" "" $adminToken 404
Test-Api "S05-R01" "Delete salesman no token" DELETE "$baseUrl/salesmen/$salesId" "" "" 401

$pass=($results|?{$_.Result -eq "PASS"}).Count
$fail=($results|?{$_.Result -eq "FAIL"}).Count
Write-Output "SALESMEN: Total=$($results.Count) Pass=$pass Fail=$fail"
$results|%{$d=if($_.Detail){"|$($_.Detail)"}else{""};Write-Output "$($_.Id)|$($_.Name)|$($_.Result)|$($_.Status)|$($_.Time)$d"}
$results|ConvertTo-Json -Depth 5|Out-File "d:\ProgramData\workspace-codeby\ting-studio\test\api-test-results\salesmen-raw.json" -Encoding utf8