$adminToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2N6aG5jenI2NTVqYmZqIiwidXNlcklkIjoibW9jemhuY3pyNjU1amJmaiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODUwNDQ0LCJleHAiOjE3ODE0NTUyNDR9.NjnyW9Zx3l_aQB8WKS1P7DRGyJDuP2tZMDloMn-vF1Y"
$formToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTQwZG52aGMzeHVjZGxvIiwidXNlcklkIjoibXE0MGRudmhjM3h1Y2RsbyIsInVzZXJuYW1lIjoiW3Rlc3RdZm9ybXVsaXN0MDEiLCJyb2xlIjoiZm9ybXVsaXN0Iiwicm9sZUlkIjpudWxsLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc4MDg1MDQ1MywiZXhwIjoxNzgxNDU1MjUzfQ.hBcsJXUDW1jmL_lBgDc02vvBrJ2a0P9V-isVAV4nIS8"
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

# M01 POST /api/materials - Create material (with code)
Test-Api "M01-P01" "Create material success" POST "$baseUrl/materials" '{"name":"[test]mat1","code":"TM001","category":"herb","unit":"g","unit_price":10.5,"ratio_factor":0.18}' $adminToken 201 "id"
$matResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body '{"name":"[test]mat-for-detail","code":"TM002","category":"herb","unit":"g","unit_price":20,"ratio_factor":0.18}'
$matId = $matResp.data.id

Test-Api "M01-E01" "Create material missing name" POST "$baseUrl/materials" '{"code":"TM003","category":"herb","unit":"g"}' $adminToken 400
Test-Api "M01-E02" "Create material missing code" POST "$baseUrl/materials" '{"name":"[test]mat-nocode","category":"herb","unit":"g"}' $adminToken 400
Test-Api "M01-V01" "Create material empty body" POST "$baseUrl/materials" '{}' $adminToken 400
Test-Api "M01-R01" "Create material no token" POST "$baseUrl/materials" '{"name":"[test]mat1","code":"TM004","category":"herb"}' "" 401

# M02 GET /api/materials - List materials
Test-Api "M02-P01" "List materials success" GET "$baseUrl/materials" "" $adminToken 200 "list"
Test-Api "M02-P02" "List materials with pagination" GET "$baseUrl/materials?page=1&pageSize=10" "" $adminToken 200 "pagination"
Test-Api "M02-P03" "List materials with search" GET "$baseUrl/materials?keyword=[test]" "" $adminToken 200
Test-Api "M02-P04" "List materials with category filter" GET "$baseUrl/materials?category=herb" "" $adminToken 200
Test-Api "M02-R01" "List materials no token" GET "$baseUrl/materials" "" "" 401

# M03 GET /api/materials/:id - Get material detail
Test-Api "M03-P01" "Get material detail" GET "$baseUrl/materials/$matId" "" $adminToken 200 "name"
Test-Api "M03-E01" "Get material not found" GET "$baseUrl/materials/nonexistent-id" "" $adminToken 404
Test-Api "M03-R01" "Get material no token" GET "$baseUrl/materials/$matId" "" "" 401

# M04 PUT /api/materials/:id - Update material
Test-Api "M04-P01" "Update material name" PUT "$baseUrl/materials/$matId" '{"name":"[test]mat1-updated"}' $adminToken 200
Test-Api "M04-E01" "Update material not found" PUT "$baseUrl/materials/nonexistent-id" '{"name":"test"}' $adminToken 404
Test-Api "M04-R01" "Update material no token" PUT "$baseUrl/materials/$matId" '{"name":"test"}' "" 401

# M05 DELETE /api/materials/:id - Delete material
$delMatResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body '{"name":"[test]mat-to-delete","code":"TMDEL1","category":"herb","unit":"g","unit_price":5,"ratio_factor":0.18}'
$delMatId = $delMatResp.data.id
Test-Api "M05-P01" "Delete material success" DELETE "$baseUrl/materials/$delMatId" "" $adminToken 200
Test-Api "M05-E01" "Delete material not found" DELETE "$baseUrl/materials/nonexistent-id" "" $adminToken 404
Test-Api "M05-R01" "Delete material no token" DELETE "$baseUrl/materials/$matId" "" "" 401

# M06 Data isolation
$formMatResp = Invoke-RestMethod -Uri "$baseUrl/materials" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $formToken"} -Body '{"name":"[test]mat-formulist","code":"TMF001","category":"herb","unit":"g","unit_price":15,"ratio_factor":0.18}'
$formMatId = $formMatResp.data.id
Test-Api "M06-D01" "Formulist sees own material" GET "$baseUrl/materials/$formMatId" "" $formToken 200

# M07 Get next code
Test-Api "M07-P01" "Get next material code" GET "$baseUrl/materials/next-code" "" $adminToken 200

$pass=($results|?{$_.Result -eq "PASS"}).Count
$fail=($results|?{$_.Result -eq "FAIL"}).Count
Write-Output "MATERIALS: Total=$($results.Count) Pass=$pass Fail=$fail"
$results|%{$d=if($_.Detail){"|$($_.Detail)"}else{""};Write-Output "$($_.Id)|$($_.Name)|$($_.Result)|$($_.Status)|$($_.Time)$d"}
$results|ConvertTo-Json -Depth 5|Out-File "d:\ProgramData\workspace-codeby\ting-studio\test\api-test-results\materials-raw.json" -Encoding utf8