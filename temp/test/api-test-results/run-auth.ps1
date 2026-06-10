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

# A01 POST /api/auth/register
Test-Api "A01-P01" "Register success" POST "$baseUrl/auth/register" '{"username":"[test]u02","password":"123456"}' "" 201 "token"
Test-Api "A01-P03" "Register default role formulist" POST "$baseUrl/auth/register" '{"username":"[test]rolechk2","password":"123456"}' "" 201 "formulist"
Test-Api "A01-E01" "Username already exists" POST "$baseUrl/auth/register" '{"username":"admin","password":"123456"}' "" 409
Test-Api "A01-B04" "Username 1 char" POST "$baseUrl/auth/register" '{"username":"a","password":"123456"}' "" 400
Test-Api "A01-B06" "Password 5 chars" POST "$baseUrl/auth/register" '{"username":"[test]spwd2","password":"12345"}' "" 400
Test-Api "A01-V01" "Missing username" POST "$baseUrl/auth/register" '{"password":"123456"}' "" 400
Test-Api "A01-V02" "Missing password" POST "$baseUrl/auth/register" '{"username":"[test]nopwd2"}' "" 400
Test-Api "A01-V07" "Empty body" POST "$baseUrl/auth/register" '{}' "" 400
Test-Api "A01-S01" "Duplicate register" POST "$baseUrl/auth/register" '{"username":"[test]dup2","password":"123456"}' "" 201
Test-Api "A01-S01b" "Duplicate register 2nd" POST "$baseUrl/auth/register" '{"username":"[test]dup2","password":"123456"}' "" 409

# A02 POST /api/auth/login
Test-Api "A02-P01" "Login success" POST "$baseUrl/auth/login" '{"username":"admin","password":"admin123"}' "" 200 "token"
Test-Api "A02-E01" "Username not exist" POST "$baseUrl/auth/login" '{"username":"nouser999","password":"123456"}' "" 401
Test-Api "A02-E02" "Wrong password" POST "$baseUrl/auth/login" '{"username":"admin","password":"wrongpwd"}' "" 401
Test-Api "A02-V03" "Empty body login" POST "$baseUrl/auth/login" '{}' "" 401
Test-Api "A02-P04" "Login resp no password" POST "$baseUrl/auth/login" '{"username":"admin","password":"admin123"}' "" 200 "token" "password"

# A03 GET /api/auth/me
Test-Api "A03-P01" "Get user info success" GET "$baseUrl/auth/me" "" $adminToken 200 "username"
Test-Api "A03-R01" "No token" GET "$baseUrl/auth/me" "" "" 401
Test-Api "A03-R02" "Invalid token" GET "$baseUrl/auth/me" "" "invalidtoken" 401
Test-Api "A03-P02" "Resp no password field" GET "$baseUrl/auth/me" "" $adminToken 200 "" "password"

# A04 PUT /api/auth/profile
Test-Api "A04-P01" "Update display name" PUT "$baseUrl/auth/profile" '{"display_name":"[test]newname"}' $adminToken 200
Test-Api "A04-P02" "Update email" PUT "$baseUrl/auth/profile" '{"email":"[test]new@example.com"}' $adminToken 200 "example.com"
Test-Api "A04-R01" "No token update profile" PUT "$baseUrl/auth/profile" '{"display_name":"test"}' "" 401
Test-Api "A04-B07" "Invalid email format" PUT "$baseUrl/auth/profile" '{"email":"notanemail"}' $adminToken 400

# A05 PUT /api/auth/password
$pwdRegResp = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body '{"username":"[test]pwduser2","password":"123456"}'
$pwdLoginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"[test]pwduser2","password":"123456"}'
$pwdToken = $pwdLoginResp.data.token
Test-Api "A05-P01" "Change password success" PUT "$baseUrl/auth/password" '{"oldPassword":"123456","newPassword":"654321"}' $pwdToken 200
Test-Api "A05-P02" "Login with new password" POST "$baseUrl/auth/login" '{"username":"[test]pwduser2","password":"654321"}' "" 200 "token"
Test-Api "A05-E01" "Old password wrong" PUT "$baseUrl/auth/password" '{"oldPassword":"wrongpwd","newPassword":"111111"}' $pwdToken 400
Test-Api "A05-R01" "No token change password" PUT "$baseUrl/auth/password" '{"oldPassword":"123456","newPassword":"654321"}' "" 401
Test-Api "A05-V01" "Missing oldPassword" PUT "$baseUrl/auth/password" '{"newPassword":"654321"}' $adminToken 400

# A06 GET /api/auth/preferences
Test-Api "A06-P01" "Get preferences" GET "$baseUrl/auth/preferences" "" $adminToken 200
Test-Api "A06-R01" "No token get preferences" GET "$baseUrl/auth/preferences" "" "" 401

# A07 PUT /api/auth/preferences
Test-Api "A07-P01" "Update preferences" PUT "$baseUrl/auth/preferences" '{"preferences":{"theme":"dark"}}' $adminToken 200
Test-Api "A07-R01" "No token update preferences" PUT "$baseUrl/auth/preferences" '{"preferences":{"theme":"dark"}}' "" 401
Test-Api "A07-V01" "Missing preferences" PUT "$baseUrl/auth/preferences" '{}' $adminToken 400
Test-Api "A07-V02" "Preferences null" PUT "$baseUrl/auth/preferences" '{"preferences":null}' $adminToken 400

# X-MD
Test-Api "X-MD01" "GET on register" GET "$baseUrl/auth/register" "" "" 404

$pass=($results|?{$_.Result -eq "PASS"}).Count
$fail=($results|?{$_.Result -eq "FAIL"}).Count
Write-Output "AUTH: Total=$($results.Count) Pass=$pass Fail=$fail"
$results|%{$d=if($_.Detail){"|$($_.Detail)"}else{""};Write-Output "$($_.Id)|$($_.Name)|$($_.Result)|$($_.Status)|$($_.Time)$d"}
$results|ConvertTo-Json -Depth 5|Out-File "d:\ProgramData\workspace-codeby\ting-studio\test\api-test-results\auth-raw.json" -Encoding utf8