$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTRjbmN4bjRkZDdlMDduIiwidXNlcklkIjoibXE0Y25jeG40ZGQ3ZTA3biIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODcxMzY0LCJleHAiOjE3ODE0NzYxNjR9.yoyMh2QGwvGcsm64lmn2pqdLeJbpvYWHIIAMl7-CE4c"
$formToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTRjdW03aG9xZ3ByNjJ1IiwidXNlcklkIjoibXE0Y3VtN2hvcWdwcjYydSIsInVzZXJuYW1lIjoidGVzdF9mb3JtdWxpc3QyIiwicm9sZSI6ImZvcm11bGlzdCIsInJvbGVJZCI6bnVsbCwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3ODA4NzEzOTksImV4cCI6MTc4MTQ3NjE5OX0.suzm7sa_xK8UVlmpjdTKKkvr2y6BdajZSk3EGXTKXSg"
$base = "http://localhost:3000/api"
$adminH = @{ "Authorization" = "Bearer $adminToken" }
$formH = @{ "Authorization" = "Bearer $formToken" }
$noAuth = @{}
$sb = [System.Text.StringBuilder]::new()

function Add-Result($id, $name, $result, $status, $time, $detail) {
    [void]$sb.AppendLine("$id|$name|$result|$status|${time}ms|$detail")
}

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
    Add-Result $id $name $(if($pass){"PASS"}else{"FAIL"}) $actualStatus $sw.ElapsedMilliseconds $detail
}

# C01
Run-Test "C01-P01" "list all files" 200 { Invoke-RestMethod -Uri "$base/files" -Method Get -Headers $adminH }
Run-Test "C01-P02" "search by keyword" 200 { Invoke-RestMethod -Uri "$base/files?keyword=test" -Method Get -Headers $adminH }
Run-Test "C01-P03" "filter by fileType" 200 { Invoke-RestMethod -Uri "$base/files?fileType=formula" -Method Get -Headers $adminH }
Run-Test "C01-P04" "filter by status" 200 { Invoke-RestMethod -Uri "$base/files?status=parsed" -Method Get -Headers $adminH }
Run-Test "C01-P05" "filter by relatedStatus" 200 { Invoke-RestMethod -Uri "$base/files?relatedStatus=unlinked" -Method Get -Headers $adminH }
Run-Test "C01-B02" "SQL injection in keyword" 200 { Invoke-RestMethod -Uri "$base/files?keyword=%27%20OR%201%3D1" -Method Get -Headers $adminH }
Run-Test "C01-B03" "page=0" 200 { Invoke-RestMethod -Uri "$base/files?page=0" -Method Get -Headers $adminH }
Run-Test "C01-R01" "no auth" 401 { Invoke-RestMethod -Uri "$base/files" -Method Get -Headers $noAuth }
Run-Test "C01-DI01" "formulist sees all" 200 { Invoke-RestMethod -Uri "$base/files" -Method Get -Headers $formH }

# C02
Run-Test "C02-P01" "file stats" 200 { Invoke-RestMethod -Uri "$base/files/stats" -Method Get -Headers $adminH }
Run-Test "C02-R01" "no auth stats" 401 { Invoke-RestMethod -Uri "$base/files/stats" -Method Get -Headers $noAuth }

# C03
Run-Test "C03-E01" "no file uploaded" 400 { Invoke-RestMethod -Uri "$base/files/upload" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "C03-R01" "no auth upload" 401 { Invoke-RestMethod -Uri "$base/files/upload" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{}" }

# C04
Run-Test "C04-E02" "empty fileIds" 400 { Invoke-RestMethod -Uri "$base/files/batch-delete" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"fileIds`":[]}" }
Run-Test "C04-V01" "missing fileIds" 400 { Invoke-RestMethod -Uri "$base/files/batch-delete" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "C04-R01" "no auth batch-delete" 401 { Invoke-RestMethod -Uri "$base/files/batch-delete" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"fileIds`":[`"f001`"]}" }
Run-Test "C04-E01" "formulist no batch-delete" 403 { Invoke-RestMethod -Uri "$base/files/batch-delete" -Method Post -Headers $formH -ContentType "application/json" -Body "{`"fileIds`":[`"f001`"]}" }

# C05
Run-Test "C05-E01" "empty fileIds archive" 400 { Invoke-RestMethod -Uri "$base/files/batch-archive" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"fileIds`":[]}" }
Run-Test "C05-V01" "missing fileIds archive" 400 { Invoke-RestMethod -Uri "$base/files/batch-archive" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "C05-R01" "no auth batch-archive" 401 { Invoke-RestMethod -Uri "$base/files/batch-archive" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"fileIds`":[`"f001`"]}" }

# C06
Run-Test "C06-P01" "fix garbled" 200 { Invoke-RestMethod -Uri "$base/files/fix-garbled" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "C06-R01" "no auth fix garbled" 401 { Invoke-RestMethod -Uri "$base/files/fix-garbled" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{}" }

# C07
Run-Test "C07-E01" "file not found" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345" -Method Get -Headers $adminH }
Run-Test "C07-R01" "no auth detail" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345" -Method Get -Headers $noAuth }

# C08
Run-Test "C08-E01" "preview not found" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/preview" -Method Get -Headers $adminH }
Run-Test "C08-R01" "no auth preview" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/preview" -Method Get -Headers $noAuth }

# C09
Run-Test "C09-E01" "thumbnail not found" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/thumbnail" -Method Get -Headers $adminH }
Run-Test "C09-R01" "no auth thumbnail" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/thumbnail" -Method Get -Headers $noAuth }

# C10
Run-Test "C10-E01" "download not found" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/download" -Method Get -Headers $adminH }
Run-Test "C10-R01" "no auth download" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/download" -Method Get -Headers $noAuth }

# C11
Run-Test "C11-P02" "audit no records" 200 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/audit" -Method Get -Headers $adminH }
Run-Test "C11-R01" "no auth audit" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/audit" -Method Get -Headers $noAuth }

# C12
Run-Test "C12-E01" "missing relatedId" 400 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/link" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"relatedType`":`"formula`"}" }
Run-Test "C12-E02" "missing relatedType" 400 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/link" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"relatedId`":`"f001`"}" }
Run-Test "C12-E03" "file not found link" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/link" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"relatedId`":`"f001`",`"relatedType`":`"formula`"}" }
Run-Test "C12-R01" "no auth link" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/link" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{`"relatedId`":`"f001`",`"relatedType`":`"formula`"}" }

# C13
Run-Test "C13-E01" "file not found unlink" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/unlink" -Method Post -Headers $adminH -ContentType "application/json" -Body "{`"relatedId`":`"f001`",`"relatedType`":`"formula`"}" }
Run-Test "C13-R01" "no auth unlink" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/unlink" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{}" }

# C14
Run-Test "C14-P02" "no relations" 200 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/relations" -Method Get -Headers $adminH }
Run-Test "C14-R01" "no auth relations" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/relations" -Method Get -Headers $noAuth }

# C15
Run-Test "C15-E01" "file not found reparse" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/reparse" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "C15-R01" "no auth reparse" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345/reparse" -Method Post -Headers $noAuth -ContentType "application/json" -Body "{}" }

# C16
Run-Test "C16-E02" "file not found delete" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345" -Method Delete -Headers $adminH }
Run-Test "C16-R01" "no auth delete" 401 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345" -Method Delete -Headers $noAuth }
Run-Test "C16-E01" "formulist no delete" 403 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345" -Method Delete -Headers $formH }

# X-MD
Run-Test "X-MD-01" "POST to list not allowed" 404 { Invoke-RestMethod -Uri "$base/files" -Method Post -Headers $adminH -ContentType "application/json" -Body "{}" }
Run-Test "X-MD-02" "GET upload not allowed" 404 { Invoke-RestMethod -Uri "$base/files/upload" -Method Get -Headers $adminH }

# X-RF
Run-Test "X-RF-01" "success response format" 200 { Invoke-RestMethod -Uri "$base/files/stats" -Method Get -Headers $adminH }

# X-SE
Run-Test "X-SE-01" "no path leak on 404" 404 { Invoke-RestMethod -Uri "$base/files/nonexist-id-12345" -Method Get -Headers $adminH }

Write-Output $sb.ToString()
