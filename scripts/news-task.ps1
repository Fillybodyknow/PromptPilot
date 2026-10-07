# ให้ Windows Task Scheduler เรียกวันละครั้ง: ดึงข่าวและเก็บ log รายวันไว้ที่ logs\news-YYYY-MM-DD.log
# สร้าง task (รันใน PowerShell แบบ admin บน server, แก้ path ให้ตรง):
#   schtasks /Create /TN "PromptPilot News Fetch" /SC DAILY /ST 06:00 /RU SYSTEM `
#     /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\path\to\PromptPilot\scripts\news-task.ps1"
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
New-Item -ItemType Directory -Force (Join-Path $repo "logs") | Out-Null
$log = Join-Path $repo ("logs\news-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
"=== $(Get-Date -Format o) ===" | Out-File -FilePath $log -Append -Encoding utf8
cmd /c "npm run news:fetch >> `"$log`" 2>&1"
exit $LASTEXITCODE
