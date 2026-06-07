$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTRjbmN4bjRkZDdlMDduIiwidXNlcklkIjoibXE0Y25jeG40ZGQ3ZTA3biIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODcxMzY0LCJleHAiOjE3ODE0NzYxNjR9.yoyMh2QGwvGcsm64lmn2pqdLeJbpvYWHIIAMl7-CE4c"
$formToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTRjdW03aG9xZ3ByNjJ1IiwidXNlcklkIjoibXE0Y3VtN2hvcWdwcjYydSIsInVzZXJuYW1lIjoidGVzdF9mb3JtdWxpc3QyIiwicm9sZSI6ImZvcm11bGlzdCIsInJvbGVJZCI6bnVsbCwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3ODA4NzEzOTksImV4cCI6MTc4MTQ3NjE5OX0.suzm7sa_xK8UVlmpjdTKKkvr2y6BdajZSk3EGXTKXSg"
$base = "http://localhost:3000/api"
$adminH = @{ "Authorization" = "Bearer $adminToken" }
$formH = @{ "Authorization" = "Bearer $formToken" }
$noAuth = @{}
$script:allResults = @()

function Run-Test($id, $name, $expectedStatus, $scriptBlock) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $actualStatus = 0
    $detail = ""
    try {
        & $scriptBlock
        $sw.Stop()
        $actualStatus = 200
    } catch {
        $sw.Stop()
        if ($_.Exception.Response) {
            try {
                $actualStatus = [int]$_.Exception.Response.StatusCode
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = [System.IO.StreamReader]::new($stream)
                $errBody = $reader.ReadToEnd()
                $detail = $errBody.Substring(0, [Math]::Min(200, $errBody.Length))
            } catch {
                $detail = $_.Exception.Message
            }
        } else {
            $detail = $_.Exception.Message
        }
    }
    $pass = ($actualStatus -eq $expectedStatus)
    $script:allResults += [PSCustomObject]@{ ID=$id; Name=$name; Result=$(if($pass){"PASS"}else{"FAIL"}); Status=$actualStatus; Time=$sw.ElapsedMilliseconds; Detail=$detail }
}

# ==================== ROLES MODULE ====================
# R01 GET /api/roles
Run-Test "R01-P01" "get roles list" 200 { Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $adminH }
Run-Test "R01-R01" "no auth roles" 401 { Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $noAuth }
Run-Test "R01-R03" "admin access roles" 200 { Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $adminH }
Run-Test "R01-R04" "formulist access roles" 200 { Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $formH }
Run-Test "R01-I01" "idempotent roles list" 200 { Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $adminH }
Run-Test "R01-DI01" "roles no data isolation" 200 { Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $formH }

# R02 GET /api/roles/:id - need a real role ID
$rolesResp = Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $adminH
$firstRoleId = ""
if ($rolesResp.data -and $rolesResp.data.Count -gt 0) { $firstRoleId = $rolesResp.data[0].id }
if ($firstRoleId) {
    Run-Test "R02-P01" "get role detail" 200 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId" -Method Get -Headers $adminH }
    Run-Test "R02-E01" "role not found" 404 { Invoke-RestMethod -Uri "$base/roles/nonexist-id-99999" -Method Get -Headers $adminH }
    Run-Test "R02-R01" "no auth role detail" 401 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId" -Method Get -Headers $noAuth }
    Run-Test "R02-DI01" "role detail no isolation" 200 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId" -Method Get -Headers $formH }
} else {
    Run-Test "R02-P01" "get role detail" 404 { Invoke-RestMethod -Uri "$base/roles/nonexist" -Method Get -Headers $adminH }
}

# R03 POST /api/roles
Run-Test "R03-P01" "create role" 201 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"[test]TestRole`",`"roleKey`":`"test_role_001`"}" }
Run-Test "R03-E01" "duplicate roleKey" 409 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"Duplicate`",`"roleKey`":`"admin`"}" }
Run-Test "R03-B02" "empty name" 400 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"`",`"roleKey`":`"test`"}" }
Run-Test "R03-B03" "empty roleKey" 400 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"Test`",`"roleKey`":`"`"}" }
Run-Test "R03-V01" "missing name" 400 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"roleKey`":`"test`"}" }
Run-Test "R03-V02" "missing roleKey" 400 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"Test`"}" }
Run-Test "R03-V06" "empty body" 400 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "R03-R01" "no auth create role" 401 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"name`":`"Test`",`"roleKey`":`"t1`"}" }
Run-Test "R03-R04" "formulist no permission" 403 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $formH -ContentType "application/json" -Body "{`"name`":`"Test`",`"roleKey`":`"t2`"}" }

# Get the created role ID for update/delete
$rolesResp2 = Invoke-RestMethod -Uri "$base/roles" -Method Get -Headers $adminH
$testRoleId = ""
foreach ($r in $rolesResp2.data) { if ($r.roleKey -eq "test_role_001") { $testRoleId = $r.id; break } }

# R04 PUT /api/roles/:id
if ($testRoleId) {
    Run-Test "R04-P01" "update role" 200 { Invoke-RestMethod -Uri "$base/roles/$testRoleId" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"[test]UpdatedRole`"}" }
    Run-Test "R04-E01" "update not found" 404 { Invoke-RestMethod -Uri "$base/roles/nonexist-id-99999" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"name`":`"Test`"}" }
    Run-Test "R04-V01" "missing name" 400 { Invoke-RestMethod -Uri "$base/roles/$testRoleId" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"description`":`"desc`"}" }
    Run-Test "R04-R01" "no auth update" 401 { Invoke-RestMethod -Uri "$base/roles/$testRoleId" -Method Put -Headers $noAuth -ContentType "application/json" -Body "{`"name`":`"Test`"}" }
    Run-Test "R04-R02" "formulist no update" 403 { Invoke-RestMethod -Uri "$base/roles/$testRoleId" -Method Put -Headers $formH -ContentType "application/json" -Body "{`"name`":`"Test`"}" }
}

# R05 DELETE /api/roles/:id
if ($testRoleId) {
    Run-Test "R05-P01" "delete custom role" 200 { Invoke-RestMethod -Uri "$base/roles/$testRoleId" -Method Delete -Headers $adminH }
    Run-Test "R05-E01" "delete not found" 404 { Invoke-RestMethod -Uri "$base/roles/nonexist-id-99999" -Method Delete -Headers $adminH }
    Run-Test "R05-I01" "delete again 404" 404 { Invoke-RestMethod -Uri "$base/roles/$testRoleId" -Method Delete -Headers $adminH }
}
# Delete system role
if ($firstRoleId) {
    Run-Test "R05-E02" "delete system role" 403 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId" -Method Delete -Headers $adminH }
}
Run-Test "R05-R01" "no auth delete role" 401 { Invoke-RestMethod -Uri "$base/roles/nonexist" -Method Delete -Headers $noAuth }
Run-Test "R05-R02" "formulist no delete" 403 { Invoke-RestMethod -Uri "$base/roles/nonexist" -Method Delete -Headers $formH }

# R06 GET /api/roles/:id/permissions
if ($firstRoleId) {
    Run-Test "R06-P01" "get role permissions" 200 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId/permissions" -Method Get -Headers $adminH }
    Run-Test "R06-B01" "nonexist role perms" 200 { Invoke-RestMethod -Uri "$base/roles/nonexist-id-99999/permissions" -Method Get -Headers $adminH }
    Run-Test "R06-R01" "no auth role perms" 401 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId/permissions" -Method Get -Headers $noAuth }
}

# R07 PUT /api/roles/:id/permissions
if ($firstRoleId) {
    Run-Test "R07-V01" "missing permissionIds" 400 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId/permissions" -Method Put -Headers $adminH -ContentType "application/json" -Body "{}" }
    Run-Test "R07-V02" "permissionIds null" 400 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId/permissions" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"permissionIds`":null}" }
    Run-Test "R07-R01" "no auth update perms" 401 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId/permissions" -Method Put -Headers $noAuth -ContentType "application/json" -Body "{`"permissionIds`":[]}" }
    Run-Test "R07-R02" "formulist no update perms" 403 { Invoke-RestMethod -Uri "$base/roles/$firstRoleId/permissions" -Method Put -Headers $formH -ContentType "application/json" -Body "{`"permissionIds`":[]}" }
}

# X-MD for roles
Run-Test "X-MD-R01" "POST to roles list" 404 { Invoke-RestMethod -Uri "$base/roles" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }

# ==================== PERMISSIONS MODULE ====================
Run-Test "P01-P01" "get permissions list" 200 { Invoke-RestMethod -Uri "$base/permissions" -Method Get -Headers $adminH }
Run-Test "P01-R01" "no auth permissions" 401 { Invoke-RestMethod -Uri "$base/permissions" -Method Get -Headers $noAuth }
Run-Test "P01-R03" "admin access perms" 200 { Invoke-RestMethod -Uri "$base/permissions" -Method Get -Headers $adminH }
Run-Test "P01-R04" "formulist access perms" 200 { Invoke-RestMethod -Uri "$base/permissions" -Method Get -Headers $formH }
Run-Test "P01-I01" "idempotent perms" 200 { Invoke-RestMethod -Uri "$base/permissions" -Method Get -Headers $adminH }
Run-Test "P01-DI01" "perms no isolation" 200 { Invoke-RestMethod -Uri "$base/permissions" -Method Get -Headers $formH }
Run-Test "P01-V02" "ignore query params" 200 { Invoke-RestMethod -Uri "$base/permissions?foo=bar" -Method Get -Headers $adminH }

# X-MD for permissions
Run-Test "X-MD-P01" "POST to permissions" 404 { Invoke-RestMethod -Uri "$base/permissions" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "X-MD-P02" "PUT to permissions" 404 { Invoke-RestMethod -Uri "$base/permissions" -Method Put -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "X-MD-P03" "DELETE permissions" 404 { Invoke-RestMethod -Uri "$base/permissions" -Method Delete -Headers $adminH }

# ==================== USERS MODULE ====================
# U01 GET /api/users
Run-Test "U01-P01" "get users list" 200 { Invoke-RestMethod -Uri "$base/users" -Method Get -Headers $adminH }
Run-Test "U01-P03" "search by keyword" 200 { Invoke-RestMethod -Uri "$base/users?keyword=admin" -Method Get -Headers $adminH }
Run-Test "U01-P06" "pagination" 200 { Invoke-RestMethod -Uri "$base/users?page=1&pageSize=10" -Method Get -Headers $adminH }
Run-Test "U01-B01" "empty keyword" 200 { Invoke-RestMethod -Uri "$base/users?keyword=" -Method Get -Headers $adminH }
Run-Test "U01-B06" "SQL injection keyword" 200 { Invoke-RestMethod -Uri "$base/users?keyword=%27%20OR%201%3D1" -Method Get -Headers $adminH }
Run-Test "U01-R01" "no auth users" 401 { Invoke-RestMethod -Uri "$base/users" -Method Get -Headers $noAuth }
Run-Test "U01-R04" "formulist no user:read" 403 { Invoke-RestMethod -Uri "$base/users" -Method Get -Headers $formH }

# Get a user ID for update tests
$usersResp = Invoke-RestMethod -Uri "$base/users" -Method Get -Headers $adminH
$firstUserId = ""
$formUserId = ""
if ($usersResp.data.list) {
    foreach ($u in $usersResp.data.list) {
        if ($u.role -eq "formulist" -and -not $formUserId) { $formUserId = $u.id }
        if (-not $firstUserId) { $firstUserId = $u.id }
    }
}

# Get admin role ID and formulist role ID
$adminRoleId = ""
$formRoleId = ""
if ($rolesResp2.data) {
    foreach ($r in $rolesResp2.data) {
        if ($r.roleKey -eq "admin") { $adminRoleId = $r.id }
        if ($r.roleKey -eq "formulist") { $formRoleId = $r.id }
    }
}

# U02 PUT /api/users/:id/role
if ($firstUserId -and $formRoleId) {
    Run-Test "U02-P01" "update user role" 200 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"roleId`":`"$formRoleId`"}" }
    Run-Test "U02-E01" "target role not found" 404 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"roleId`":`"nonexist-role-id`"}" }
    Run-Test "U02-V01" "missing roleId" 400 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $adminH -ContentType "application/json" -Body "{}" }
    Run-Test "U02-V02" "empty roleId" 400 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"roleId`":`"`"}" }
    Run-Test "U02-R01" "no auth update role" 401 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $noAuth -ContentType "application/json" -Body "{`"roleId`":`"$formRoleId`"}" }
    Run-Test "U02-R04" "formulist no user:write" 403 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $formH -ContentType "application/json" -Body "{`"roleId`":`"$formRoleId`"}" }
    # Restore admin role
    if ($adminRoleId) {
        Run-Test "U02-P02" "restore admin role" 200 { Invoke-RestMethod -Uri "$base/users/$firstUserId/role" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"roleId`":`"$adminRoleId`"}" }
    }
}

# U03 PUT /api/users/:id/status
if ($formUserId) {
    Run-Test "U03-P01" "disable user" 200 { Invoke-RestMethod -Uri "$base/users/$formUserId/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"isActive`":0}" }
    Run-Test "U03-P02" "enable user" 200 { Invoke-RestMethod -Uri "$base/users/$formUserId/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"isActive`":1}" }
    Run-Test "U03-V01" "missing isActive" 400 { Invoke-RestMethod -Uri "$base/users/$formUserId/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{}" }
    Run-Test "U03-V02" "isActive is string" 400 { Invoke-RestMethod -Uri "$base/users/$formUserId/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"isActive`":`"0`"}" }
    Run-Test "U03-R01" "no auth update status" 401 { Invoke-RestMethod -Uri "$base/users/$formUserId/status" -Method Put -Headers $noAuth -ContentType "application/json" -Body "{`"isActive`":0}" }
    Run-Test "U03-R04" "formulist no user:write" 403 { Invoke-RestMethod -Uri "$base/users/$formUserId/status" -Method Put -Headers $formH -ContentType "application/json" -Body "{`"isActive`":0}" }
}
# Cannot disable self
$adminUserId = "mq4cncxn4dd7e07n"
Run-Test "U03-E01" "cannot disable self" 400 { Invoke-RestMethod -Uri "$base/users/$adminUserId/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"isActive`":0}" }
Run-Test "U03-E02" "cannot disable admin" 400 { Invoke-RestMethod -Uri "$base/users/$adminUserId/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"isActive`":0}" }
Run-Test "U03-E03" "user not found status" 404 { Invoke-RestMethod -Uri "$base/users/nonexist-id-99999/status" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"isActive`":0}" }

# X-MD for users
Run-Test "X-MD-U01" "POST to users list" 404 { Invoke-RestMethod -Uri "$base/users" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }

# ==================== REPORTS MODULE ====================
# D01 POST /api/reports/check-period
Run-Test "D01-P01" "check period not exists" 200 { Invoke-RestMethod -Uri "$base/reports/check-period" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"type`":`"weekly`",`"periodStart`":`"2020-01-06`"}" }
Run-Test "D01-E01" "missing type" 400 { Invoke-RestMethod -Uri "$base/reports/check-period" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"periodStart`":`"2026-06-02`"}" }
Run-Test "D01-E02" "missing periodStart" 400 { Invoke-RestMethod -Uri "$base/reports/check-period" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"type`":`"weekly`"}" }
Run-Test "D01-R01" "no auth check period" 401 { Invoke-RestMethod -Uri "$base/reports/check-period" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"type`":`"weekly`",`"periodStart`":`"2026-06-02`"}" }

# D02 GET /api/reports/data/weekly
Run-Test "D02-P01" "get weekly data" 200 { Invoke-RestMethod -Uri "$base/reports/data/weekly?periodStart=2026-06-01&periodEnd=2026-06-07" -Method Get -Headers $adminH }
Run-Test "D02-E01" "missing time range" 400 { Invoke-RestMethod -Uri "$base/reports/data/weekly" -Method Get -Headers $adminH }
Run-Test "D02-R01" "no auth weekly data" 401 { Invoke-RestMethod -Uri "$base/reports/data/weekly?periodStart=2026-06-01&periodEnd=2026-06-07" -Method Get -Headers $noAuth }

# D03 GET /api/reports/data/monthly
Run-Test "D03-P01" "get monthly data" 200 { Invoke-RestMethod -Uri "$base/reports/data/monthly?periodStart=2026-05-01&periodEnd=2026-05-31" -Method Get -Headers $adminH }
Run-Test "D03-R01" "no auth monthly data" 401 { Invoke-RestMethod -Uri "$base/reports/data/monthly?periodStart=2026-05-01&periodEnd=2026-05-31" -Method Get -Headers $noAuth }

# D04 GET /api/reports/targets
Run-Test "D04-P01" "get targets" 200 { Invoke-RestMethod -Uri "$base/reports/targets" -Method Get -Headers $adminH }
Run-Test "D04-R01" "no auth targets" 401 { Invoke-RestMethod -Uri "$base/reports/targets" -Method Get -Headers $noAuth }

# D05 POST /api/reports/targets
Run-Test "D05-P01" "create target" 201 { Invoke-RestMethod -Uri "$base/reports/targets" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"periodType`":`"quarterly`",`"periodStart`":`"2026-04-01`",`"periodEnd`":`"2026-06-30`",`"targetsJson`":{`"targets`":[{`"metric`":`"[test]`",`"target`":50}]}}" }
Run-Test "D05-E01" "missing periodType" 400 { Invoke-RestMethod -Uri "$base/reports/targets" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"periodStart`":`"2026-04-01`",`"periodEnd`":`"2026-06-30`"}" }
Run-Test "D05-R01" "no auth create target" 401 { Invoke-RestMethod -Uri "$base/reports/targets" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"periodType`":`"quarterly`"}" }

# Get target ID for update/delete
$targetsResp = Invoke-RestMethod -Uri "$base/reports/targets" -Method Get -Headers $adminH
$firstTargetId = ""
if ($targetsResp.data -and $targetsResp.data.Count -gt 0) { $firstTargetId = $targetsResp.data[$targetsResp.data.Count - 1].id }

# D06 PUT /api/reports/targets/:id
if ($firstTargetId) {
    Run-Test "D06-P01" "update target" 200 { Invoke-RestMethod -Uri "$base/reports/targets/$firstTargetId" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"targetsJson`":{`"targets`":[{`"metric`":`"updated`",`"target`":100}]}}" }
    Run-Test "D06-E01" "target not found" 404 { Invoke-RestMethod -Uri "$base/reports/targets/nonexist-id-99999" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"targetsJson`":{}}" }
    Run-Test "D06-R01" "no auth update target" 401 { Invoke-RestMethod -Uri "$base/reports/targets/$firstTargetId" -Method Put -Headers $noAuth -ContentType "application/json" -Body "{`"targetsJson`":{}}" }
}

# D07 DELETE /api/reports/targets/:id
if ($firstTargetId) {
    Run-Test "D07-P01" "delete target" 200 { Invoke-RestMethod -Uri "$base/reports/targets/$firstTargetId" -Method Delete -Headers $adminH }
    Run-Test "D07-E01" "target not found delete" 404 { Invoke-RestMethod -Uri "$base/reports/targets/nonexist-id-99999" -Method Delete -Headers $adminH }
    Run-Test "D07-I01" "delete again 404" 404 { Invoke-RestMethod -Uri "$base/reports/targets/$firstTargetId" -Method Delete -Headers $adminH }
}
Run-Test "D07-R01" "no auth delete target" 401 { Invoke-RestMethod -Uri "$base/reports/targets/nonexist" -Method Delete -Headers $noAuth }

# D11 POST /api/reports/generate
Run-Test "D11-P01" "generate weekly report" 201 { Invoke-RestMethod -Uri "$base/reports/generate" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"type`":`"weekly`",`"periodStart`":`"2020-01-06`",`"periodEnd`":`"2020-01-12`"}" }
Run-Test "D11-E01" "missing type" 400 { Invoke-RestMethod -Uri "$base/reports/generate" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"periodStart`":`"2026-06-02`",`"periodEnd`":`"2026-06-08`"}" }
Run-Test "D11-E04" "invalid type" 400 { Invoke-RestMethod -Uri "$base/reports/generate" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"type`":`"daily`",`"periodStart`":`"2026-06-02`",`"periodEnd`":`"2026-06-08`"}" }
Run-Test "D11-R01" "no auth generate" 401 { Invoke-RestMethod -Uri "$base/reports/generate" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"type`":`"weekly`"}" }

# D12 GET /api/reports
Run-Test "D12-P01" "get reports list" 200 { Invoke-RestMethod -Uri "$base/reports" -Method Get -Headers $adminH }
Run-Test "D12-P02" "filter by type" 200 { Invoke-RestMethod -Uri "$base/reports?type=weekly" -Method Get -Headers $adminH }
Run-Test "D12-R01" "no auth reports list" 401 { Invoke-RestMethod -Uri "$base/reports" -Method Get -Headers $noAuth }

# Get a report ID
$reportsResp = Invoke-RestMethod -Uri "$base/reports" -Method Get -Headers $adminH
$firstReportId = ""
if ($reportsResp.data.list -and $reportsResp.data.list.Count -gt 0) { $firstReportId = $reportsResp.data.list[0].id }

# D13 GET /api/reports/:id
if ($firstReportId) {
    Run-Test "D13-P01" "get report detail" 200 { Invoke-RestMethod -Uri "$base/reports/$firstReportId" -Method Get -Headers $adminH }
}
Run-Test "D13-E01" "report not found" 404 { Invoke-RestMethod -Uri "$base/reports/nonexist-id-99999" -Method Get -Headers $adminH }
Run-Test "D13-R01" "no auth report detail" 401 { Invoke-RestMethod -Uri "$base/reports/nonexist-id-99999" -Method Get -Headers $noAuth }

# D17 PUT /api/reports/:id
if ($firstReportId) {
    Run-Test "D17-P01" "update report title" 200 { Invoke-RestMethod -Uri "$base/reports/$firstReportId" -Method Put -Headers $adminH -ContentType "application/json" -Body "{`"title`":`"[test]Updated Title`"}" }
    Run-Test "D17-E03" "no update fields" 400 { Invoke-RestMethod -Uri "$base/reports/$firstReportId" -Method Put -Headers $adminH -ContentType "application/json" -Body "{}" }
}

# D18 DELETE /api/reports/:id
if ($firstReportId) {
    Run-Test "D18-P01" "delete report" 200 { Invoke-RestMethod -Uri "$base/reports/$firstReportId" -Method Delete -Headers $adminH }
    Run-Test "D18-I01" "delete again 404" 404 { Invoke-RestMethod -Uri "$base/reports/$firstReportId" -Method Delete -Headers $adminH }
}
Run-Test "D18-E01" "report not found delete" 404 { Invoke-RestMethod -Uri "$base/reports/nonexist-id-99999" -Method Delete -Headers $adminH }
Run-Test "D18-R01" "no auth delete report" 401 { Invoke-RestMethod -Uri "$base/reports/nonexist-id-99999" -Method Delete -Headers $noAuth }

# D09 POST /api/reports/ai-analysis - skip (AI service)
# D14-D16 export - skip (binary response)

# Output all results grouped by module
$modules = @{
    "R" = "roles"
    "P" = "permissions"
    "U" = "users"
    "D" = "reports"
}

foreach ($entry in $modules.GetEnumerator()) {
    $prefix = $entry.Key
    $modName = $entry.Value
    $modResults = $script:allResults | Where-Object { $_.ID -match "^$prefix\d|^X-MD-$prefix" }
    if ($modResults) {
        $pass = ($modResults | Where-Object { $_.Result -eq "PASS" }).Count
        $fail = ($modResults | Where-Object { $_.Result -eq "FAIL" }).Count
        $total = $modResults.Count
        Write-Output "=== $modName MODULE: Total=$total Pass=$pass Fail=$fail ==="
        $modResults | ForEach-Object { Write-Output "$($_.ID)|$($_.Name)|$($_.Result)|$($_.Status)|$($_.Time)ms|$($_.Detail)" }
        Write-Output ""
    }
}
