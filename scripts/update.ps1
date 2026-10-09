<#
.SYNOPSIS
  อัปเดต PromptPilot เป็นเวอร์ชันล่าสุดจาก git ในคำสั่งเดียว
  ทำ: สำรองฐานข้อมูล -> git pull -> หยุดเว็บ -> npm ci -> build -> migrate -> เปิดเว็บ -> ทดสอบ
  ถ้าขั้นไหนพัง จะคืนเว็บเวอร์ชันเดิมให้อัตโนมัติ (เว็บหยุดประมาณ 1-3 นาทีระหว่างอัปเดต)
  port / ที่เก็บไฟล์สำรอง / ที่อยู่ MySQL อ่านจากค่าที่ install.ps1 ตั้งไว้ ไม่ต้องใส่ซ้ำ
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\update.ps1
#>
param(
    [string]$ServiceName = "PromptPilot",
    # ไม่ต้องใส่ — ถ้าไม่ใส่จะอ่านจาก service / งานสำรองข้อมูลที่ install.ps1 ตั้งไว้
    [int]$Port,
    [string]$BackupDir,
    [string]$MysqlBin,
    # ข้ามการสำรองฐานข้อมูล (ไม่แนะนำ)
    [switch]$SkipBackup
)
. "$PSScriptRoot\lib.ps1"
Set-Location $Repo
Assert-Admin
Import-MachineEnv
if (-not (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) { Stop-WithError "Service $ServiceName not found. Run scripts\install.ps1 first." }
if (-not $Port) { $Port = Get-ServicePort $ServiceName }
if (-not $Port) { Stop-WithError "Could not read the port of service $ServiceName. Pass -Port <port>." }
$taskCfg = Get-BackupTaskSettings
if (-not $BackupDir) { $BackupDir = if ($taskCfg.OutDir) { $taskCfg.OutDir } else { "C:\Apps\backup" } }
if (-not $MysqlBin -and $taskCfg.MysqlBin) { $MysqlBin = $taskCfg.MysqlBin }

# ---------------------------------------------------------------- 1. สำรองฐานข้อมูล
if ($SkipBackup) {
    Write-Warn "Skipping database backup."
} else {
    Write-Step "Backing up the database"
    $backupArgs = @{ OutDir = $BackupDir }
    if ($MysqlBin) { $backupArgs.MysqlBin = $MysqlBin }
    $global:LASTEXITCODE = 0
    & "$PSScriptRoot\backup-db.ps1" @backupArgs
    # exit ในสคริปต์ที่เรียกด้วย & จบแค่สคริปต์นั้น จึงต้องเช็ก exit code เอง
    if ($LASTEXITCODE -ne 0) { Stop-WithError "Database backup failed - nothing was changed. Fix the backup or rerun with -SkipBackup." }
}

# ---------------------------------------------------------------- 2. ดึงโค้ด
Write-Step "Pulling the latest code"
$before = (& git rev-parse --short HEAD).Trim()
Invoke-Native "git pull" "git.exe" @("pull", "--ff-only")
$after = (& git rev-parse --short HEAD).Trim()
if ($before -eq $after) {
    # รอบก่อนอาจพังกลางทางจนเว็บดับ — ถ้าเว็บยังไม่ตอบ ให้ build/เปิดเวอร์ชันนี้ใหม่แทนที่จะจบว่า "ไม่มีอะไรทำ"
    if ((Get-Service -Name $ServiceName).Status -eq "Running" -and (Wait-Healthy -Port $Port -TimeoutSec 15)) {
        Write-Ok "Already up to date ($after) and the site is running. Nothing to do."
        exit 0
    }
    Write-Warn "Already at $after but the site is not answering - rebuilding and restarting it."
} else {
    Write-Ok "Updating $before -> $after"
    $null = Invoke-NativeCode "git.exe" @("log", "--oneline", "$before..$after")
}

$next = Join-Path $Repo ".next"
$prev = Join-Path $Repo ".next.prev"

function Restore-Previous([string]$Reason) {
    Write-Host ""
    Write-Host "Update failed: $Reason" -ForegroundColor Red
    Write-Host "Restoring the previous version ($before) ..." -ForegroundColor Yellow
    $ErrorActionPreference = "Continue"
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    if ($after -ne $before) {
        $null = Invoke-NativeCode "git.exe" @("reset", "--hard", $before)
        $null = Invoke-NativeCode "npm.cmd" @("ci", "--no-audit", "--no-fund")
    }
    if (Test-Path $prev) {
        Remove-Item $next -Recurse -Force -ErrorAction SilentlyContinue
        Rename-Item $prev ".next"
    }
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (Wait-Healthy -Port $Port) { Write-Host "Previous version is back online. Send the error above to the developer." -ForegroundColor Yellow }
    else { Write-Host "Previous version did NOT come back. See logs\web.log and DEPLOY.md section 8 (restore)." -ForegroundColor Red }
    exit 1
}

# ---------------------------------------------------------------- 3. หยุดเว็บ, build, migrate, เปิดเว็บ
# ทุกอย่างหลังจากนี้อยู่ใน try: error แบบไหนก็ตาม (service หยุดไม่ได้, ไฟล์ถูกล็อก, กด Ctrl+C) จะคืนเวอร์ชันเดิมเสมอ
try {
    # ต้องหยุดก่อน npm ci เพราะ Windows ล็อกไฟล์ที่ process กำลังใช้ (เช่นตัวย่อรูป sharp)
    Write-Step "Stopping $ServiceName"
    Stop-Service -Name $ServiceName -Force

    # เก็บ build เดิมไว้ ถ้า build ใหม่ไม่ผ่านจะได้เปิดเวอร์ชันเดิมกลับมาได้ทันที
    if (Test-Path $prev) { Remove-Item $prev -Recurse -Force }
    if (Test-Path $next) { Rename-Item $next ".next.prev" }

    Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
    Write-Step "Installing packages (npm ci)"
    $code = Invoke-NativeCode "npm.cmd" @("ci", "--no-audit", "--no-fund")
    if ($code -ne 0) { Restore-Previous "npm ci (exit code $code)" }

    Write-Step "Building (npm run build)"
    $code = Invoke-NativeCode "npm.cmd" @("run", "build")
    if ($code -ne 0) { Restore-Previous "npm run build (exit code $code)" }

    # migrate หลัง build ผ่านแล้ว — ถ้าเปลี่ยนตารางก่อนแล้ว build พัง เวอร์ชันเดิมอาจใช้กับตารางใหม่ไม่ได้
    Write-Step "Migrating the database"
    $code = Invoke-NativeCode "npm.cmd" @("run", "db:migrate")
    if ($code -ne 0) { Restore-Previous "npm run db:migrate (exit code $code) - if tables were partly changed, restore the backup in $BackupDir" }

    Write-Step "Starting $ServiceName"
    Start-Service -Name $ServiceName
    if (-not (Wait-Healthy -Port $Port)) { Restore-Previous "the new version did not answer on http://127.0.0.1:$Port within 90s" }
} catch {
    Restore-Previous $_.Exception.Message
}
if (Test-Path $prev) { Remove-Item $prev -Recurse -Force -ErrorAction SilentlyContinue }

# ---------------------------------------------------------------- 4. งานตามเวลาที่เพิ่มในเวอร์ชันหลัง
# server ที่ติดตั้งก่อนมีการตรวจข้อมูลด้วย AI ยังไม่มีงานนี้ — สร้างให้ (ถ้ามีแล้วไม่แตะ เผื่อ IT ปรับเวลาไว้)
if (-not (Get-ScheduledTask -TaskName "PromptPilot Content Check" -ErrorAction SilentlyContinue)) {
    Register-DailyTask "PromptPilot Content Check" "07:00" "-File `"$Repo\scripts\content-task.ps1`""
    Write-Ok "Added AI content check daily at 07:00 (task: PromptPilot Content Check)"
}

Write-Host ""
Write-Host "Update complete: $before -> $after" -ForegroundColor Green
