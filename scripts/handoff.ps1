<#
.SYNOPSIS
  สร้าง "ชุดส่งมอบ" ให้ฝ่าย IT ติดตั้ง PromptPilot บน server — รันบนเครื่องผู้พัฒนา (ไม่ต้องเปิดแบบ Administrator)
  ได้โฟลเดอร์ที่มี:
    promptpilot.sql     ข้อมูลปัจจุบันทั้งหมด (ข่าว เครื่องมือ คู่มือ ผู้ใช้ ข้อเสนอแก้ไข)
    env.server          ไฟล์ตั้งค่า server: ค่าที่ใช้ร่วมกับเครื่องนี้ (Microsoft login, API key, ผู้ดูแลคนแรก) ใส่ให้แล้ว
                        + รหัสผ่าน MySQL ที่สุ่มใหม่ — ช่องที่ IT ต้องกรอกเองขึ้นต้นด้วย <<
    อ่านก่อน-IT.txt     ขั้นตอนติดตั้งพร้อมคำสั่งที่ใส่ค่าจริงแล้ว
  ไฟล์ในโฟลเดอร์มี API key และรหัสผ่าน — ส่งผ่านช่องทางที่ปลอดภัยเท่านั้น
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\handoff.ps1 -AppUrl https://promptpilot.company.local
#>
param(
    # ที่อยู่เว็บจริงบน server (ถ้ายังไม่รู้ ไม่ต้องใส่ — IT กรอกเองใน env.server)
    [string]$AppUrl,
    # ใส่ MS_CLIENT_SECRET ของเครื่องนี้ไปด้วย (ค่าเริ่มต้น: ไม่ใส่ — ให้ IT สร้าง secret ใหม่สำหรับ server ใน Entra เอง)
    [switch]$IncludeClientSecret,
    [string]$OutDir = [Environment]::GetFolderPath("Desktop"),
    [string]$RepoUrl = "https://github.com/all2gether-webcenter/PromptPilot.git",
    [string]$MysqlBin
)
. "$PSScriptRoot\lib.ps1"
Set-Location $Repo

$envFile = Join-Path $Repo ".env.local"
if (-not (Test-Path $envFile)) { Stop-WithError "$envFile not found." }
$local = Read-EnvFile $envFile
if ($AppUrl) {
    $AppUrl = $AppUrl.TrimEnd("/")
    if ($AppUrl -notmatch '^https://[^/\s]+') { Stop-WithError "-AppUrl must look like https://promptpilot.company.local" }
}

$dir = Join-Path $OutDir ("PromptPilot-handoff-{0}" -f (Get-Date -Format "yyyy-MM-dd"))
if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
New-Item -ItemType Directory -Force $dir | Out-Null

# ---------------------------------------------------------------- 1. ข้อมูล
Write-Step "Dumping the database"
$dumpArgs = @{ OutDir = $dir; KeepDays = 3650 }
if ($MysqlBin) { $dumpArgs.MysqlBin = $MysqlBin }
$global:LASTEXITCODE = 0
& "$PSScriptRoot\backup-db.ps1" @dumpArgs
if ($LASTEXITCODE -ne 0) { Stop-WithError "Database dump failed." }
$dump = Get-ChildItem $dir -Filter "*.sql" | Select-Object -First 1
Rename-Item $dump.FullName "promptpilot.sql"
Write-Ok "promptpilot.sql"

# ---------------------------------------------------------------- 2. ไฟล์ตั้งค่า server
Write-Step "Writing env.server"
# รหัสผ่าน MySQL ใหม่สำหรับ server: ตัวอักษร+ตัวเลข 28 ตัว (ไม่มีอักขระต้องห้ามของ .env)
$chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789".ToCharArray()
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 28
$rng.GetBytes($bytes)
$dbPass = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })

$todo = @{}  # ช่องที่ IT ต้องกรอก → คำอธิบาย
$values = @{
    DB_HOST = "localhost"
    DB_PORT = "3306"
    DB_NAME = if ($local["DB_NAME"]) { $local["DB_NAME"] } else { "promptpilot" }
    DB_PASS = $dbPass
    DB_USER = ""
}
$values.APP_URL = if ($AppUrl) { $AppUrl } else { $todo.APP_URL = "ที่อยู่เว็บจริง เช่น https://promptpilot.company.local"; "<<ที่อยู่เว็บจริง https://...>>" }
$values.MS_CLIENT_SECRET = if ($IncludeClientSecret -and $local["MS_CLIENT_SECRET"]) { $local["MS_CLIENT_SECRET"] } else { $todo.MS_CLIENT_SECRET = "client secret ใหม่ของ server จาก Entra (Certificates & secrets)"; "<<client secret ใหม่จาก Entra>>" }
# ค่าที่เหมือนเครื่องนี้ทุกประการ
foreach ($k in "MS_TENANT_ID", "MS_CLIENT_ID", "ADMIN_EMAILS", "MS_ALLOW_EXTERNAL", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_MODEL", "OPENAI_MODEL", "CONTENT_CHECK_MAX_NEWS", "CONTENT_CHECK_MAX_STALE") {
    if ($local[$k]) { $values[$k] = $local[$k] }
}
foreach ($k in "MS_TENANT_ID", "MS_CLIENT_ID", "ADMIN_EMAILS") {
    if (-not $values[$k]) { $values[$k] = "<<ยังไม่มีในเครื่องผู้พัฒนา>>"; $todo[$k] = "ยังไม่ได้ตั้งในเครื่องผู้พัฒนา" }
}
if (-not $values.ANTHROPIC_API_KEY -and -not $values.OPENAI_API_KEY) { Write-Warn "No AI key in .env.local - news summaries and AI checks will not run on the server." }

# ใช้ .env.example เป็นแม่แบบ (คงคำอธิบายทุกบรรทัด) แล้วแทนค่า — บรรทัดที่ comment ไว้ (# KEY=) เปิดใช้ถ้ามีค่า
$out = foreach ($line in Get-Content (Join-Path $Repo ".env.example") -Encoding UTF8) {
    if ($line -match '^\s*#?\s*([A-Z][A-Z0-9_]*)=(.*)$' -and $values.ContainsKey($Matches[1])) { "$($Matches[1])=$($values[$Matches[1]])" }
    else { $line }
}
$serverEnv = Join-Path $dir "env.server"
[IO.File]::WriteAllLines($serverEnv, [string[]]$out, (New-Object Text.UTF8Encoding($false)))
Write-Ok "env.server (MySQL password generated, $($todo.Count) value(s) left for IT)"

# ---------------------------------------------------------------- 3. คำแนะนำสำหรับ IT
$appShown = if ($AppUrl) { $AppUrl } else { "https://<ที่อยู่เว็บจริง>" }
$todoText = if ($todo.Count) { ($todo.GetEnumerator() | Sort-Object Name | ForEach-Object { "   - $($_.Name): $($_.Value)" }) -join "`r`n" } else { "   (ไม่มี — กรอกครบแล้ว)" }
$secretStep = if ($values.MS_CLIENT_SECRET -like "<<*") { "   - Certificates & secrets > New client secret แล้วนำ Value ไปใส่ MS_CLIENT_SECRET ใน env.server`r`n" } else { "" }
$readme = @"
ติดตั้ง PromptPilot บน server — ชุดส่งมอบวันที่ $(Get-Date -Format "yyyy-MM-dd")
====================================================================
รายละเอียดเต็มอยู่ใน DEPLOY.md ในโค้ด (เลขขั้นด้านล่างอ้างอิงหัวข้อในนั้น)

ไฟล์ในโฟลเดอร์นี้
  promptpilot.sql   ข้อมูลทั้งหมดจากเครื่องผู้พัฒนา
  env.server        ไฟล์ตั้งค่า (มีรหัสผ่านและ API key — ห้ามส่งต่อ ลบทิ้งหลังติดตั้ง)

ค่าที่ต้องกรอกเองใน env.server (ช่องที่ขึ้นต้นด้วย <<)
$todoText

1. ติดตั้งซอฟต์แวร์ (DEPLOY.md ขั้นที่ 2): Node.js 24, Git, MySQL 8, NSSM

2. สร้างฐานข้อมูล (ขั้นที่ 3) — รหัสผ่านตรงกับ DB_PASS ใน env.server แล้ว คัดลอกไปรันได้เลย
     & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
     CREATE DATABASE $($values.DB_NAME) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
     CREATE USER '$($values.DB_NAME)'@'localhost' IDENTIFIED BY '$dbPass';
     GRANT ALL PRIVILEGES ON $($values.DB_NAME).* TO '$($values.DB_NAME)'@'localhost';
     FLUSH PRIVILEGES;
     EXIT;

3. Microsoft Entra (ขั้นที่ 3.5) — ใช้ App registration เดิม (Client ID $($values.MS_CLIENT_ID))
   - Authentication > Web > Redirect URIs เพิ่ม: $appShown/auth/microsoft/callback
$secretStep
4. ดาวน์โหลดโค้ด (ต้องมีสิทธิ์อ่าน repository — ขอผู้พัฒนาเพิ่มบัญชี GitHub ของคุณ)
     git clone --branch main $RepoUrl C:\Apps\PromptPilot

5. ติดตั้ง (PowerShell แบบ Administrator) — วางไฟล์ในโฟลเดอร์นี้ไว้ที่ C:\Apps\handoff ก่อน (หรือแก้ path ในคำสั่ง)
     powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\install.ps1 -EnvFile C:\Apps\handoff\env.server -SqlDump C:\Apps\handoff\promptpilot.sql
   ต้องจบด้วย "Installation complete." สีเขียว

6. ตั้ง reverse proxy IIS หรือ Apache ให้ $appShown ชี้ไปที่ http://127.0.0.1:3000 (ขั้นที่ 6)

7. ทดสอบ (ขั้นที่ 7): เปิด $appShown แล้ว login ด้วยบัญชี $($values.ADMIN_EMAILS)

8. ลบโฟลเดอร์นี้ทิ้งเมื่อติดตั้งเสร็จ (สคริปต์คัดลอก env.server ไปเป็น C:\Apps\PromptPilot\.env.local และล็อกสิทธิ์ให้แล้ว)

อัปเดตเวอร์ชันครั้งต่อไป: powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\update.ps1
"@
# BOM ให้ Notepad รุ่นเก่าเปิดภาษาไทยถูก
[IO.File]::WriteAllText((Join-Path $dir "อ่านก่อน-IT.txt"), $readme, (New-Object Text.UTF8Encoding($true)))
Write-Ok "อ่านก่อน-IT.txt"

Write-Host ""
Write-Host "Handoff folder ready: $dir" -ForegroundColor Green
if ($todo.Count) { Write-Host ("IT still has to fill in env.server: " + (($todo.Keys | Sort-Object) -join ", ")) -ForegroundColor Yellow }
Write-Host "It contains API keys and passwords - share it through a secure channel (not chat or plain email)." -ForegroundColor Yellow
