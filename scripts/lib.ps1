# ฟังก์ชันร่วมของ install.ps1 / update.ps1 / backup-db.ps1 (dot-source: . "$PSScriptRoot\lib.ps1")
# ข้อความที่แสดงบนจอเป็นภาษาอังกฤษ เพราะ console ของ Windows Server ภาษาอังกฤษมักแสดงภาษาไทยไม่ได้

$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }

$script:Repo = Split-Path -Parent $PSScriptRoot

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Write-Ok([string]$Text) { Write-Host "    OK  $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "    WARN  $Text" -ForegroundColor Yellow }

function Stop-WithError([string]$Text) {
    Write-Host ""
    Write-Host "FAILED: $Text" -ForegroundColor Red
    exit 1
}

# รันโปรแกรมภายนอกแล้วคืน exit code
# ใช้ ErrorActionPreference=Continue ระหว่างรัน: ใน PowerShell 5.1 ถ้า output ถูก redirect (เช่น *> log, รันผ่าน RMM)
# ข้อความ stderr ปกติของ git/npm (progress, npm warn) จะกลายเป็น error ที่หยุดสคริปต์ทันทีเมื่อเป็น Stop
function Invoke-NativeCode([string]$Exe, [string[]]$Arguments) {
    $ErrorActionPreference = "Continue"
    & $Exe @Arguments | Out-Host
    return $LASTEXITCODE
}

# รันโปรแกรมภายนอกแล้วหยุดสคริปต์ถ้า exit code ไม่ใช่ 0
function Invoke-Native([string]$What, [string]$Exe, [string[]]$Arguments) {
    $code = Invoke-NativeCode $Exe $Arguments
    if ($code -ne 0) { Stop-WithError "$What (exit code $code)" }
}

function Assert-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Stop-WithError "Run PowerShell as Administrator."
    }
}

# อ่าน .env.local เป็น hashtable (ไม่รองรับค่าหลายบรรทัด ซึ่งโปรเจกต์นี้ไม่ได้ใช้)
function Read-EnvFile([string]$Path) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $values[$Matches[1]] = $Matches[2]
        }
    }
    return $values
}

# ค่าที่ตั้งเป็น environment variable ระดับเครื่อง (DEPLOY.md ขั้นที่ 4/5) — ดึงเข้า process นี้ด้วย
# จะได้ไม่ต้องปิดเปิด PowerShell ใหม่ และให้ build / health check เห็นค่าเดียวกับ service
$script:MachineEnvKeys = @("NEXT_PUBLIC_BASE_PATH", "NODE_USE_ENV_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY")
function Import-MachineEnv {
    foreach ($key in $MachineEnvKeys) {
        $value = [Environment]::GetEnvironmentVariable($key, "Machine")
        if ($value) { Set-Item -Path "Env:$key" -Value $value }
    }
}

# รอให้เว็บตอบ 200 ภายในเวลาที่กำหนด (ถ้าตั้ง NEXT_PUBLIC_BASE_PATH หน้าแรกจะอยู่ใต้ path นั้น)
function Wait-Healthy([int]$Port, [int]$TimeoutSec = 90) {
    $basePath = ([string]$env:NEXT_PUBLIC_BASE_PATH).TrimEnd("/")
    # /api/health ไม่ต้อง login และตรวจการเชื่อมต่อฐานข้อมูลด้วย (หน้าแรกต้อง login จึง redirect ไปหน้า login ที่ไม่แตะ DB)
    $url = "http://127.0.0.1:$Port$basePath/api/health"
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
            if ($res.StatusCode -eq 200) { return $true }
        } catch { }
        Start-Sleep -Seconds 3
    }
    return $false
}

function Find-MysqlBin {
    $candidates = Get-ChildItem "C:\Program Files\MySQL" -Directory -Filter "MySQL Server*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName "bin" }
    foreach ($dir in $candidates) {
        if (Test-Path (Join-Path $dir "mysqldump.exe")) { return $dir }
    }
    return $null
}

# port ที่ service ใช้อยู่ (อ่านจาก AppParameters ที่ install.ps1 ตั้งไว้ใน NSSM)
function Get-ServicePort([string]$ServiceName) {
    $params = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName\Parameters" -ErrorAction SilentlyContinue
    if ($params -and $params.AppParameters -match '-p\s+(\d+)') { return [int]$Matches[1] }
    return $null
}

# ค่า -OutDir / -MysqlBin ของงานสำรองข้อมูลที่ install.ps1 ตั้งไว้
function Get-BackupTaskSettings {
    $task = Get-ScheduledTask -TaskName "PromptPilot DB Backup" -ErrorAction SilentlyContinue
    $result = @{}
    if ($task) {
        $taskArgs = [string]$task.Actions[0].Arguments
        if ($taskArgs -match '-OutDir\s+"([^"]+)"') { $result.OutDir = $Matches[1] }
        if ($taskArgs -match '-MysqlBin\s+"([^"]+)"') { $result.MysqlBin = $Matches[1] }
    }
    return $result
}

# ให้เฉพาะ Administrators และ SYSTEM เขียน/อ่านโฟลเดอร์ได้ — โฟลเดอร์ใต้ C:\ ปกติผู้ใช้ทั่วไปสร้างไฟล์ได้
# ซึ่งจะเปิดช่องให้วางไฟล์ (เช่น npm.bat, next.config.js) ที่ service/งานตามเวลาซึ่งรันเป็น SYSTEM หยิบไปรัน
function Protect-Folder([string]$Path) {
    New-Item -ItemType Directory -Force $Path | Out-Null
    $code = Invoke-NativeCode "icacls.exe" @($Path, "/inheritance:r", "/grant:r", "*S-1-5-32-544:(OI)(CI)F", "*S-1-5-18:(OI)(CI)F", "/T", "/C", "/Q")
    if ($code -ne 0) { Stop-WithError "Could not set permissions on $Path (icacls exit code $code)" }
}
