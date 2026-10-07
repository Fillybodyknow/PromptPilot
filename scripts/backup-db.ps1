<#
.SYNOPSIS
  สำรองฐานข้อมูล PromptPilot เป็นไฟล์ .sql (อ่านค่าเชื่อมต่อจาก .env.local) และลบไฟล์ที่เก่ากว่า KeepDays วัน
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\backup-db.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\backup-db.ps1 -OutDir D:\Backup\PromptPilot -KeepDays 60
#>
param(
    [string]$OutDir = "C:\Apps\backup",
    [string]$MysqlBin,
    [int]$KeepDays = 30
)
. "$PSScriptRoot\lib.ps1"

if (-not $MysqlBin) { $MysqlBin = Find-MysqlBin }
if (-not $MysqlBin -or -not (Test-Path (Join-Path $MysqlBin "mysqldump.exe"))) {
    Stop-WithError "mysqldump.exe not found. Install MySQL client tools or pass -MysqlBin 'C:\Program Files\MySQL\MySQL Server 8.0\bin'."
}
$envFile = Join-Path $Repo ".env.local"
if (-not (Test-Path $envFile)) { Stop-WithError "$envFile not found." }
$cfg = Read-EnvFile $envFile
$user = if ($cfg["DB_USER"]) { $cfg["DB_USER"] } else { $cfg["DB_NAME"] }
$dbHost = if ($cfg["DB_HOST"]) { $cfg["DB_HOST"] } else { "localhost" }
$dbPort = if ($cfg["DB_PORT"]) { $cfg["DB_PORT"] } else { "3306" }

New-Item -ItemType Directory -Force $OutDir | Out-Null
$out = Join-Path $OutDir ("{0}-{1}.sql" -f $cfg["DB_NAME"], (Get-Date -Format "yyyy-MM-dd_HHmm"))

# ใส่รหัสผ่านใน option file ชั่วคราวที่อ่านได้เฉพาะผู้ที่รันสคริปต์นี้ แทนการพิมพ์ใน command line ที่คนอื่นเห็นได้
# ต้องเขียนแบบไม่มี BOM ไม่อย่างนั้น mysqldump อ่านบรรทัดแรกไม่ออก
$optFile = Join-Path $env:TEMP ("pp-dump-{0}.cnf" -f [Guid]::NewGuid())
$escapedPass = ([string]$cfg["DB_PASS"]).Replace('\', '\\').Replace('"', '\"')
[IO.File]::WriteAllText($optFile, "[client]`nuser=$user`npassword=`"$escapedPass`"`nhost=$dbHost`nport=$dbPort`n", (New-Object Text.UTF8Encoding($false)))
$me = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
Invoke-Native "Set permissions on temp file" "icacls.exe" @($optFile, "/inheritance:r", "/grant:r", "*${me}:F", "/Q")
try {
    # --no-tablespaces: ผู้ใช้ของแอปไม่มีสิทธิ์ PROCESS ซึ่ง MySQL 8 ขอเมื่อ dump ข้อมูล tablespace
    Invoke-Native "mysqldump" (Join-Path $MysqlBin "mysqldump.exe") @("--defaults-extra-file=$optFile", "--single-transaction", "--no-tablespaces",
        "--set-gtid-purged=OFF", "--default-character-set=utf8mb4", "--result-file=$out", $cfg["DB_NAME"])
} finally {
    Remove-Item $optFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $out) -or (Get-Item $out).Length -lt 1024) { Stop-WithError "Backup file is missing or empty: $out" }
Write-Ok ("Backup written: {0} ({1:N1} MB)" -f $out, ((Get-Item $out).Length / 1MB))

Get-ChildItem $OutDir -Filter "$($cfg["DB_NAME"])-*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    Remove-Item -Force
