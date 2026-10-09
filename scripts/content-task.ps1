# ให้ Windows Task Scheduler เรียกวันละครั้ง (หลังดึงข่าว): ให้ AI ตรวจข้อมูลเครื่องมือกับหน้าทางการของผู้ให้บริการ
# แล้วสร้างข้อเสนอแก้ไขให้ผู้ดูแลอนุมัติในหน้า admin — เก็บ log รายวันไว้ที่ logs\content-YYYY-MM-DD.log
# install.ps1 สร้าง task "PromptPilot Content Check" ให้แล้ว
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
New-Item -ItemType Directory -Force (Join-Path $repo "logs") | Out-Null
$log = Join-Path $repo ("logs\content-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
"=== $(Get-Date -Format o) ===" | Out-File -FilePath $log -Append -Encoding utf8
cmd /c "npm run content:check >> `"$log`" 2>&1"
exit $LASTEXITCODE
