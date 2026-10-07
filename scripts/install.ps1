<#
.SYNOPSIS
  ติดตั้ง PromptPilot บน Windows Server ในคำสั่งเดียว — ดูขั้นตอนเต็มใน DEPLOY.md
  ทำ: ตรวจเครื่อง -> npm ci -> นำเข้า/สร้างฐานข้อมูล -> build -> Windows Service -> งานดึงข่าวรายวัน -> งานสำรองข้อมูลรายคืน -> ทดสอบ
  รันซ้ำได้ (เช่นหลังแก้ .env.local) — ส่วนที่ติดตั้งไว้แล้วจะถูกตั้งค่าใหม่ ข้อมูลในฐานข้อมูลไม่ถูกลบ
.EXAMPLE
  # ครั้งแรก พร้อมนำเข้าข้อมูลจากเครื่องผู้พัฒนา
  powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\install.ps1 -SqlDump C:\Apps\promptpilot.sql
.EXAMPLE
  # ครั้งแรก เริ่มจากข้อมูลตั้งต้น (ไม่มีข่าวเก่า)
  powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\install.ps1
#>
param(
    # ไฟล์ dump จาก mysqldump ของผู้พัฒนา — นำเข้าได้เฉพาะฐานข้อมูลที่ยังว่าง
    [string]$SqlDump,
    # port ภายในที่แอปรับ (reverse proxy ต้องชี้มาที่ port นี้)
    [int]$Port = 3000,
    [string]$Nssm = "C:\Tools\nssm\nssm.exe",
    [string]$ServiceName = "PromptPilot",
    # เวลาดึงข่าวทุกวัน (HH:mm)
    [string]$FetchTime = "06:00",
    # โฟลเดอร์เก็บไฟล์สำรองฐานข้อมูลรายคืน
    [string]$BackupDir = "C:\Apps\backup",
    [string]$BackupTime = "02:00",
    [string]$MysqlBin
)
. "$PSScriptRoot\lib.ps1"
Set-Location $Repo
Import-MachineEnv

# ---------------------------------------------------------------- 1. ตรวจเครื่อง
Write-Step "Checking prerequisites"
Assert-Admin
if ($FetchTime -notmatch '^\d{2}:\d{2}$' -or $BackupTime -notmatch '^\d{2}:\d{2}$') { Stop-WithError "-FetchTime / -BackupTime must look like 06:00" }
if ($SqlDump -and -not (Test-Path $SqlDump)) { Stop-WithError "SQL dump not found: $SqlDump" }

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Stop-WithError "Node.js not found. Install Node.js 24 LTS (x64), then open a new PowerShell window." }
$nodeExe = $nodeCmd.Source
$nodeVersion = & $nodeExe -v
if ([int]($nodeVersion.TrimStart("v").Split(".")[0]) -lt 24) { Stop-WithError "Node.js 24 or newer is required (found $nodeVersion)." }
Write-Ok "Node.js $nodeVersion"

if (-not (Test-Path $Nssm)) { Stop-WithError "NSSM not found at $Nssm. Download from https://nssm.cc and place win64\nssm.exe there, or pass -Nssm <path>." }
Write-Ok "NSSM $Nssm"

if (-not $MysqlBin) { $MysqlBin = Find-MysqlBin }
if ($MysqlBin) { Write-Ok "MySQL client tools $MysqlBin" }
else { Write-Warn "mysqldump.exe not found - nightly backup will NOT be scheduled (pass -MysqlBin to enable)." }
if ($env:NEXT_PUBLIC_BASE_PATH) { Write-Ok "Sub-path (NEXT_PUBLIC_BASE_PATH): $env:NEXT_PUBLIC_BASE_PATH" }

# ---------------------------------------------------------------- 2. ตรวจ .env.local
Write-Step "Checking .env.local"
$envFile = Join-Path $Repo ".env.local"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $Repo ".env.example") $envFile
    Stop-WithError "Created $envFile from .env.example. Fill in the values (notepad `"$envFile`"), then run this script again."
}
$cfg = Read-EnvFile $envFile
$missing = @("DB_NAME", "DB_PASS", "ADMIN_USER", "ADMIN_PASSWORD") | Where-Object { -not $cfg[$_] }
if ($missing) { Stop-WithError ("Empty in .env.local: " + ($missing -join ", ")) }
if (-not $cfg["ANTHROPIC_API_KEY"] -and -not $cfg["OPENAI_API_KEY"]) { Stop-WithError "Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY in .env.local." }
# ตัวเว็บ (Next.js), สคริปต์ฐานข้อมูล และสคริปต์สำรองข้อมูล อ่านอักขระเหล่านี้ใน .env ต่างกัน
# (เช่น $ ถูกตีความเป็นตัวแปร, # เป็น comment) รหัสผ่านจะผิดแค่บางส่วน — จึงห้ามใช้ไปเลย
$unsafe = @("DB_NAME", "DB_USER", "DB_PASS", "ADMIN_USER", "ADMIN_PASSWORD") |
    Where-Object { $cfg[$_] -and $cfg[$_] -match '[\$#"''`\s\\]' }
if ($unsafe) { Stop-WithError ("These values contain characters that are not allowed (`$ # quotes backtick backslash or spaces): " + ($unsafe -join ", ") + ". Use letters, digits and symbols like ! @ % ^ & * - _ + = . , ? instead.") }
if ($cfg["ADMIN_PASSWORD"].Length -lt 16) { Write-Warn "ADMIN_PASSWORD is shorter than 16 characters." }
# ไฟล์มีรหัสผ่านและ API key — ให้อ่านได้เฉพาะ Administrators และ SYSTEM (ใช้ SID จะได้ไม่ขึ้นกับภาษาของ Windows)
Invoke-Native "Set permissions on .env.local" "icacls.exe" @($envFile, "/inheritance:r", "/grant:r", "*S-1-5-32-544:F", "*S-1-5-18:F", "/Q")
Write-Ok ".env.local complete, access limited to Administrators and SYSTEM"

# ---------------------------------------------------------------- 3. หยุด service เดิม (กรณีรันซ้ำ) ก่อนแตะ node_modules/.next
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
$wasRunning = $existing -and $existing.Status -eq "Running"
$completed = $false
try {
    if ($existing -and $existing.Status -ne "Stopped") {
        Write-Step "Stopping existing service $ServiceName"
        Stop-Service -Name $ServiceName -Force
    }

    # ---------------------------------------------------------------- 4. สิทธิ์โฟลเดอร์
    Write-Step "Restricting folder permissions to Administrators and SYSTEM"
    Protect-Folder $Repo
    if ($MysqlBin) { Protect-Folder $BackupDir }
    Write-Ok "$Repo$(if ($MysqlBin) { ", $BackupDir" })"

    # ---------------------------------------------------------------- 5. ติดตั้ง package
    # ต้องมี devDependencies (tsx, drizzle-kit) เพราะสคริปต์ดึงข่าวและ migrate ใช้ — จึงห้าม --omit=dev
    Write-Step "Installing packages (npm ci)"
    Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
    Invoke-Native "npm ci" "npm.cmd" @("ci", "--no-audit", "--no-fund")

    # ---------------------------------------------------------------- 6. ฐานข้อมูล
    Write-Step "Setting up the database"
    if ($SqlDump) {
        Invoke-Native "Import $SqlDump" "npx.cmd" @("tsx", "scripts/db/import-dump.ts", $SqlDump)
    }
    Invoke-Native "Database migration" "npm.cmd" @("run", "db:migrate")
    # ใส่ข้อมูลตั้งต้นเฉพาะเมื่อตารางยังว่าง (seed ข้ามเองถ้ามีข้อมูลแล้ว เช่นหลังนำเข้า dump)
    Invoke-Native "Seed initial data" "npm.cmd" @("run", "db:seed")

    # ---------------------------------------------------------------- 7. build
    Write-Step "Building the web app (npm run build)"
    Invoke-Native "npm run build" "npm.cmd" @("run", "build")

    # ---------------------------------------------------------------- 8. Windows Service
    Write-Step "Registering Windows service $ServiceName (port $Port)"
    $logDir = Join-Path $Repo "logs"
    New-Item -ItemType Directory -Force $logDir | Out-Null
    if (-not $existing) {
        Invoke-Native "nssm install" $Nssm @("install", $ServiceName, $nodeExe)
    }
    $settings = @(
        @("Application", $nodeExe),
        # รับเฉพาะจากเครื่องตัวเอง — ผู้ใช้เข้าผ่าน IIS/Apache เท่านั้น
        @("AppParameters", "node_modules\next\dist\bin\next start -H 127.0.0.1 -p $Port"),
        @("AppDirectory", $Repo),
        @("DisplayName", "PromptPilot Web"),
        @("Description", "PromptPilot - AI news and enterprise AI guide (Next.js)"),
        @("Start", "SERVICE_AUTO_START"),
        @("AppStdout", (Join-Path $logDir "web.log")),
        @("AppStderr", (Join-Path $logDir "web.log")),
        @("AppRotateFiles", "1"),
        @("AppRotateOnline", "1"),
        @("AppRotateBytes", "10485760"),
        @("AppExit", "Default", "Restart"),
        @("AppRestartDelay", "5000")
    )
    foreach ($s in $settings) {
        Invoke-Native "nssm set $($s[0])" $Nssm (@("set", $ServiceName) + $s)
    }
    # ส่ง proxy / sub-path ระดับเครื่องให้ service ตรงๆ — service ไม่เห็น environment variable ที่เพิ่งตั้งจนกว่าจะรีสตาร์ตเครื่อง
    $extra = @($MachineEnvKeys | Where-Object { Test-Path "Env:$_" } | ForEach-Object { "$_=$((Get-Item "Env:$_").Value)" })
    if ($extra.Count -gt 0) { Invoke-Native "nssm set AppEnvironmentExtra" $Nssm (@("set", $ServiceName, "AppEnvironmentExtra") + $extra) }
    else { $null = Invoke-NativeCode $Nssm @("reset", $ServiceName, "AppEnvironmentExtra") }

    Start-Service -Name $ServiceName
    if (-not (Wait-Healthy -Port $Port)) { Stop-WithError "The site did not answer on http://127.0.0.1:$Port within 90s. See $logDir\web.log" }
    Write-Ok "Service running and answering on port $Port"
    $completed = $true
} finally {
    # ถ้าล้มเหลวกลางทาง (เช่น build พัง) ให้เปิด service เดิมกลับมา เว็บจะได้ไม่ดับเพราะการติดตั้งซ้ำ
    if (-not $completed -and $wasRunning) {
        Write-Warn "Restarting the previously running service $ServiceName ..."
        Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------- 9. งานตามเวลา
Write-Step "Scheduling tasks"
# ใช้ cmdlet แทน schtasks.exe — PowerShell 5.1 ส่งอาร์กิวเมนต์ที่มีเครื่องหมาย " ให้โปรแกรมภายนอกผิดรูป
function Register-DailyTask([string]$Name, [string]$At, [string]$Arguments) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass $Arguments" -WorkingDirectory $Repo
    $trigger = New-ScheduledTaskTrigger -Daily -At $At
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    # StartWhenAvailable: ถ้าเครื่องปิดอยู่ตอนถึงเวลา ให้รันทันทีที่เปิด
    $taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Principal $principal -Settings $taskSettings -Force | Out-Null
}
Register-DailyTask "PromptPilot News Fetch" $FetchTime "-File `"$Repo\scripts\news-task.ps1`""
Write-Ok "News fetch daily at $FetchTime (task: PromptPilot News Fetch)"
if ($MysqlBin) {
    Register-DailyTask "PromptPilot DB Backup" $BackupTime "-File `"$Repo\scripts\backup-db.ps1`" -OutDir `"$BackupDir`" -MysqlBin `"$MysqlBin`""
    Write-Ok "Database backup daily at $BackupTime to $BackupDir (task: PromptPilot DB Backup)"
}

# ---------------------------------------------------------------- เสร็จ
Write-Host ""
Write-Host "Installation complete." -ForegroundColor Green
Write-Host "Next steps (see DEPLOY.md):"
Write-Host "  1. Configure IIS or Apache to reverse-proxy https://<your-host>/ to http://127.0.0.1:$Port/"
Write-Host "  2. Test the news fetch now:  Start-ScheduledTask -TaskName 'PromptPilot News Fetch'"
Write-Host "     then check $Repo\logs\news-$(Get-Date -Format 'yyyy-MM-dd').log"
