# คู่มือติดตั้ง PromptPilot บน Windows Server

สำหรับทีม IT Support ทำตามทีละขั้นจากบนลงล่างได้เลย ทุกคำสั่งให้รันใน **PowerShell แบบ Run as Administrator**

## ภาพรวม

```
ผู้ใช้ ──HTTPS──▶ IIS หรือ Apache (reverse proxy, ถือ certificate)
                     │
                     ▼ http://127.0.0.1:3000 (เครื่องเดียวกัน ไม่เปิดออกภายนอก)
               PromptPilot (Node.js รันเป็น Windows Service)
                     │
                     ▼
               MySQL 8.0 ขึ้นไป (ฐานข้อมูล promptpilot)

Task Scheduler ──ทุกวัน 06:00──▶ ดึงข่าว AI จากอินเทอร์เน็ต → ให้ AI สรุป → บันทึกลง MySQL
```

- เว็บเป็นแอป Node.js ไม่ใช่ไฟล์ static จึงต้องรัน process ค้างไว้ตลอด แล้วให้ IIS/Apache ส่งต่อ request เข้ามา
- ข้อมูลทั้งหมด (เครื่องมือ, คู่มือ, ข่าว) อยู่ใน MySQL ผู้ดูแลเนื้อหาแก้ผ่านหน้า `/admin` ของเว็บเอง ไม่ต้องแก้ไฟล์บน server

ตัวอย่างในคู่มือใช้ค่าต่อไปนี้ เปลี่ยนให้ตรงกับของจริงได้:

| ค่า | ตัวอย่างในคู่มือ |
|---|---|
| โฟลเดอร์ติดตั้ง | `C:\Apps\PromptPilot` |
| port ภายในของแอป | `3000` |
| ชื่อเว็บ | `promptpilot.company.local` |
| ชื่อฐานข้อมูล / ผู้ใช้ MySQL | `promptpilot` |

---

## 0. สิ่งที่ต้องได้จากผู้พัฒนาก่อนเริ่ม

| รายการ | ใช้ทำอะไร |
|---|---|
| สิทธิ์เข้าถึง repository `https://github.com/Fillybodyknow/PromptPilot` และชื่อ branch ที่จะติดตั้ง (ตอนนี้คือ `feature/news-pipeline`) | ดาวน์โหลดโค้ด |
| ไฟล์ `promptpilot.sql` (dump ฐานข้อมูลจากเครื่องผู้พัฒนา) | ย้ายข้อมูลปัจจุบัน (ข่าวที่อนุมัติแล้ว, เครื่องมือที่แก้ไว้) ขึ้น server ถ้าไม่มี ให้ใช้ข้อมูลตั้งต้นแทนได้ (ขั้นที่ 5 ทางเลือก B) |
| `ANTHROPIC_API_KEY` และ/หรือ `OPENAI_API_KEY` | ให้ AI สรุปข่าว ระบบใช้ Claude ก่อน ถ้าใช้ไม่ได้จะใช้ OpenAI แทน มีอย่างน้อย 1 ตัว |
| ชื่อผู้ใช้/รหัสผ่านสำหรับหน้า admin | ตั้ง `ADMIN_USER` / `ADMIN_PASSWORD` |

> ส่ง API key และรหัสผ่านผ่านช่องทางที่ปลอดภัย (เช่น password manager ของบริษัท) ห้ามส่งทางแชตหรืออีเมลธรรมดา

ผู้พัฒนาสร้างไฟล์ dump จากเครื่องตัวเองด้วยคำสั่ง:

```powershell
& "C:\Program Files\MySQL\MySQL Server 9.5\bin\mysqldump.exe" -u promptpilot -p --single-transaction --default-character-set=utf8mb4 --result-file=promptpilot.sql promptpilot
```

## 1. สเปกเครื่องและเครือข่าย

- **ระบบปฏิบัติการ:** Windows Server 2019 / 2022 / 2025 (x64)
- **ทรัพยากร:** RAM ว่างอย่างน้อย 1 GB สำหรับแอป, พื้นที่ดิสก์ 3 GB
- **การเชื่อมต่อขาออก (outbound HTTPS 443) ที่ต้องเปิด:**
  - ตอนติดตั้ง: `registry.npmjs.org`, `github.com`, `fonts.googleapis.com`, `fonts.gstatic.com` (build ดาวน์โหลดฟอนต์)
  - ตอนใช้งาน: `api.anthropic.com`, `api.openai.com` และเว็บแหล่งข่าว เช่น `news.google.com`, `blog.google`, `deepmind.google`, `openai.com`, `huggingface.co`, `github.blog`, `github.com`, `aws.amazon.com`, `azure.microsoft.com`, `www.microsoft.com`, `cloudblog.withgoogle.com`, `www.blognone.com`
  - ผู้ดูแลเนื้อหาเพิ่มแหล่งข่าวใหม่ได้เองจากหน้า admin ถ้า firewall ใช้ allowlist ต้องเพิ่มโดเมนตามไปด้วย
- **ถ้าองค์กรออกอินเทอร์เน็ตผ่าน HTTP proxy:** ดูหัวข้อ "ใช้ผ่าน proxy ขององค์กร" ท้ายขั้นที่ 4
- **ขาเข้า:** เปิดแค่ 443 (และ 80 ถ้าจะ redirect ไป HTTPS) ที่ IIS/Apache ส่วน port 3000 **ไม่ต้องเปิด** เพราะแอปรับเฉพาะจากเครื่องตัวเอง

## 2. ติดตั้งซอฟต์แวร์พื้นฐาน

1. **Node.js 24 LTS (x64)** จาก https://nodejs.org ติดตั้งด้วยไฟล์ `.msi` ค่าเริ่มต้นทั้งหมด (ให้เพิ่มเข้า PATH)
2. **Git for Windows** จาก https://git-scm.com
3. **MySQL Server 8.0 ขึ้นไป** ถ้ายังไม่มี (ใช้ MySQL ที่องค์กรมีอยู่แล้วก็ได้ ไม่จำเป็นต้องอยู่เครื่องเดียวกัน)
4. **NSSM** (ตัวช่วยรันโปรแกรมเป็น Windows Service) จาก https://nssm.cc/download แตกไฟล์แล้ววาง `win64\nssm.exe` ไว้ที่ `C:\Tools\nssm\nssm.exe`

ปิด PowerShell แล้วเปิดใหม่ (แบบ Administrator) แล้วตรวจ:

```powershell
node -v      # ต้องขึ้นต้นด้วย v24
npm -v
git --version
```

## 3. เตรียมฐานข้อมูล MySQL

เข้า MySQL ด้วยบัญชี admin (ปรับ path ตามเวอร์ชันที่ติดตั้ง):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

แล้วรันคำสั่ง SQL (เปลี่ยน `ตั้งรหัสผ่านที่นี่` เป็นรหัสผ่านจริงที่คาดเดายาก):

```sql
CREATE DATABASE promptpilot CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'promptpilot'@'localhost' IDENTIFIED BY 'ตั้งรหัสผ่านที่นี่';
GRANT ALL PRIVILEGES ON promptpilot.* TO 'promptpilot'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

- ต้องเป็น `utf8mb4` เพราะเนื้อหาเป็นภาษาไทย
- ถ้า MySQL อยู่คนละเครื่องกับแอป ให้เปลี่ยน `'localhost'` เป็น IP ของเครื่องแอป และเปิด port 3306 ระหว่างสองเครื่องเท่านั้น
- แอปต้องการสิทธิ์สร้าง/แก้ตารางด้วย (ใช้ตอนอัปเดตเวอร์ชัน) จึงให้ `ALL PRIVILEGES` เฉพาะฐานข้อมูลนี้

## 4. ดาวน์โหลดโค้ดและตั้งค่า

```powershell
New-Item -ItemType Directory -Force C:\Apps | Out-Null
git clone --branch feature/news-pipeline https://github.com/Fillybodyknow/PromptPilot.git C:\Apps\PromptPilot
Set-Location C:\Apps\PromptPilot
```

สร้างไฟล์ตั้งค่า `C:\Apps\PromptPilot\.env.local`:

```powershell
notepad C:\Apps\PromptPilot\.env.local
```

ใส่ค่าตามนี้ แล้วบันทึกเป็น UTF-8:

```ini
# ฐานข้อมูล
DB_HOST=localhost
DB_PORT=3306
DB_NAME=promptpilot
DB_PASS=รหัสผ่าน MySQL จากขั้นที่ 3
# DB_USER=        ← ใส่เฉพาะเมื่อชื่อผู้ใช้ MySQL ไม่ใช่ชื่อเดียวกับ DB_NAME

# บัญชีเข้าหน้า /admin
ADMIN_USER=ชื่อผู้ใช้ admin
ADMIN_PASSWORD=รหัสผ่าน admin (ยาวอย่างน้อย 16 ตัวอักษร)

# AI สำหรับสรุปข่าว (มีอย่างน้อย 1 ตัว — ใช้ Claude ก่อน ไม่ได้จะใช้ OpenAI)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

ล็อกไฟล์ให้อ่านได้เฉพาะ Administrators และ SYSTEM (ไฟล์มีรหัสผ่านและ API key):

```powershell
icacls C:\Apps\PromptPilot\.env.local /inheritance:r /grant:r "Administrators:F" "SYSTEM:F"
```

> ห้าม commit หรือคัดลอกไฟล์ `.env.local` ไปที่อื่น

ติดตั้ง package และ build:

```powershell
Set-Location C:\Apps\PromptPilot
npm ci
npm run build
```

- ใช้ `npm ci` แบบปกติ **ห้ามใส่ `--omit=dev` หรือตั้ง `NODE_ENV=production` ก่อนรัน** เพราะสคริปต์ดึงข่าวและอัปเดตฐานข้อมูลใช้ package กลุ่ม dev (`tsx`, `drizzle-kit`)
- ต้องรัน `npm ci` บน server เครื่องนี้เอง ห้ามคัดลอกโฟลเดอร์ `node_modules` มาจากเครื่องอื่น เพราะตัวย่อรูป (`sharp`) ต้องเป็นของ Windows x64
- ถ้าจะให้เว็บอยู่ใต้ path ย่อย เช่น `https://intranet.company.local/promptpilot` ให้ตั้ง `$env:NEXT_PUBLIC_BASE_PATH="/promptpilot"` ก่อน `npm run build` (ค่านี้ฝังตอน build) ถ้าใช้โดเมนของตัวเองไม่ต้องตั้ง

### ใช้ผ่าน proxy ขององค์กร

ถ้าเครื่องออกอินเทอร์เน็ตได้ผ่าน proxy เท่านั้น:

- **ตอนติดตั้ง:**
  ```powershell
  npm config set proxy http://proxy.company.local:8080
  npm config set https-proxy http://proxy.company.local:8080
  ```
- **ตอนใช้งาน:** ตั้งเป็น environment variable ระดับเครื่อง เพราะ Node.js อ่านค่า proxy ตอนเริ่ม process ซึ่งเกิดก่อนอ่าน `.env.local` จึงใส่ใน `.env.local` ไม่ได้
  ```powershell
  [Environment]::SetEnvironmentVariable("NODE_USE_ENV_PROXY", "1", "Machine")
  [Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://proxy.company.local:8080", "Machine")
  [Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1", "Machine")
  ```
  ตั้งแล้วให้รีสตาร์ต service PromptPilot (ขั้นที่ 7) เพื่อให้เว็บและงานดึงข่าวเห็นค่าใหม่

## 5. สร้างตารางและใส่ข้อมูล

```powershell
Set-Location C:\Apps\PromptPilot
```

เลือกทางใดทางหนึ่ง:

**ทางเลือก A — ย้ายข้อมูลจากเครื่องผู้พัฒนา (แนะนำ)**

วางไฟล์ไว้ที่ `C:\Apps\promptpilot.sql` แล้วรัน (ใช้ `/` ใน path ของ `source`):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u promptpilot -p --default-character-set=utf8mb4 promptpilot --execute="source C:/Apps/promptpilot.sql"
npm run db:migrate
```

> อย่านำเข้าด้วยการ pipe (`Get-Content ... | mysql`) ใน Windows PowerShell 5.1 เพราะจะแปลง encoding จนภาษาไทยเสีย

`db:migrate` จะอัปเดตโครงสร้างตารางให้ตรงกับโค้ด ถ้าตรงอยู่แล้วจะไม่เปลี่ยนอะไร

**ทางเลือก B — เริ่มจากข้อมูลตั้งต้น (ไม่มีข่าวเก่า)**

```powershell
npm run db:migrate
npm run db:seed
```

ทั้งสองทางต้องจบด้วยข้อความ `migrations applied successfully` และไม่มี error

## 6. ทดสอบรันด้วยมือ

```powershell
Set-Location C:\Apps\PromptPilot
node node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3000
```

เปิด PowerShell อีกหน้าต่างแล้วตรวจ:

```powershell
(Invoke-WebRequest http://127.0.0.1:3000/ -UseBasicParsing).StatusCode   # ต้องได้ 200
```

ได้ 200 แล้วกด `Ctrl+C` ในหน้าต่างแรกเพื่อหยุด แล้วไปขั้นถัดไป

## 7. ติดตั้งเป็น Windows Service (เปิดเองเมื่อเครื่องรีสตาร์ต)

```powershell
$nssm = "C:\Tools\nssm\nssm.exe"
& $nssm install PromptPilot "C:\Program Files\nodejs\node.exe"
& $nssm set PromptPilot AppParameters "node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3000"
& $nssm set PromptPilot AppDirectory "C:\Apps\PromptPilot"
& $nssm set PromptPilot DisplayName "PromptPilot Web"
& $nssm set PromptPilot Start SERVICE_AUTO_START
& $nssm set PromptPilot AppStdout "C:\Apps\PromptPilot\logs\web.log"
& $nssm set PromptPilot AppStderr "C:\Apps\PromptPilot\logs\web.log"
& $nssm set PromptPilot AppRotateFiles 1
& $nssm set PromptPilot AppRotateBytes 10485760
New-Item -ItemType Directory -Force C:\Apps\PromptPilot\logs | Out-Null
& $nssm start PromptPilot
```

- `AppDirectory` ต้องเป็นโฟลเดอร์โปรเจกต์ เพราะแอปอ่าน `.env.local` และเขียน `logs\` จากโฟลเดอร์ที่รันอยู่
- service รันเป็น LocalSystem โดยค่าเริ่มต้น ถ้าองค์กรกำหนดให้ใช้ service account แยก บัญชีนั้นต้องอ่าน `.env.local` และเขียน `C:\Apps\PromptPilot\logs` กับ `C:\Apps\PromptPilot\.next` ได้

ตรวจว่า service ทำงาน:

```powershell
Get-Service PromptPilot                                                    # Status ต้องเป็น Running
(Invoke-WebRequest http://127.0.0.1:3000/ -UseBasicParsing).StatusCode    # ต้องได้ 200
```

## 8. ตั้ง Reverse Proxy

เลือกตามที่ server ใช้ **IIS หรือ Apache อย่างใดอย่างหนึ่ง**

มี 2 จุดที่ต้องตั้งให้ถูก ไม่อย่างนั้นหน้า admin จะใช้ไม่ได้:

1. **ส่ง Host header เดิมต่อให้แอป** แอปตรวจว่าคำขอบันทึกข้อมูลมาจากโดเมนเดียวกัน (กัน CSRF) ถ้า proxy เปลี่ยน Host เป็น `127.0.0.1:3000` การกดบันทึกในหน้า admin จะล้มเหลว
2. **ส่ง error 401 ของแอปผ่านไปตรงๆ** หน้า admin ใช้ Basic Authentication ของแอปเอง ถ้า proxy เอาหน้า error ของตัวเองมาแทน browser จะไม่ขึ้นช่องให้ใส่รหัสผ่าน

### 8A. IIS

1. ติดตั้ง **URL Rewrite** และ **Application Request Routing (ARR) 3.0** จาก https://www.iis.net/downloads/microsoft
2. เปิด proxy ของ ARR และให้ส่ง Host header เดิม:
   ```powershell
   $appcmd = "$env:windir\system32\inetsrv\appcmd.exe"
   & $appcmd set config -section:system.webServer/proxy /enabled:"True" /preserveHostHeader:"True" /commit:apphost
   ```
3. ใน IIS Manager สร้าง Site ใหม่:
   - **Physical path:** โฟลเดอร์ว่าง เช่น `C:\inetpub\promptpilot` (ไม่ใช่โฟลเดอร์โปรเจกต์)
   - **Binding:** https, host name `promptpilot.company.local`, certificate ขององค์กร
4. ที่ Site นี้ > **Authentication** เปิด **Anonymous Authentication** อย่างเดียว และปิด Windows Authentication
5. สร้างไฟล์ `C:\inetpub\promptpilot\web.config`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="PromptPilot" stopProcessing="true">
             <match url="(.*)" />
             <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
           </rule>
         </rules>
       </rewrite>
       <!-- ส่ง 401/404/500 ของแอปผ่านไปตรงๆ (จำเป็นต่อหน้า login ของ /admin) -->
       <httpErrors existingResponse="PassThrough" />
       <security>
         <requestFiltering allowDoubleEscaping="true" />
       </security>
     </system.webServer>
   </configuration>
   ```
6. ไม่บังคับ แต่ช่วยให้หน้าเว็บทยอยแสดงผลเร็วขึ้น: ให้ ARR ไม่พักข้อมูลก่อนส่ง
   ```powershell
   & $appcmd set config -section:system.webServer/proxy /responseBufferLimit:"0" /commit:apphost
   ```

### 8B. Apache (httpd บน Windows)

1. ใน `httpd.conf` เปิดโมดูล (เอา `#` หน้าบรรทัดออก): `mod_proxy`, `mod_proxy_http`, `mod_headers`, `mod_ssl`
2. เพิ่ม VirtualHost:
   ```apache
   <VirtualHost *:443>
       ServerName promptpilot.company.local
       SSLEngine on
       SSLCertificateFile    "C:/Apache24/conf/ssl/promptpilot.crt"
       SSLCertificateKeyFile "C:/Apache24/conf/ssl/promptpilot.key"

       ProxyPreserveHost On
       ProxyPass        / http://127.0.0.1:3000/
       ProxyPassReverse / http://127.0.0.1:3000/
       RequestHeader set X-Forwarded-Proto "https"
   </VirtualHost>
   ```
3. ตรวจ config แล้วรีสตาร์ต: `httpd -t` ต้องได้ `Syntax OK` จากนั้นรีสตาร์ต service ของ Apache

> ใช้ HTTPS เสมอ เพราะ Basic Authentication ของหน้า admin ส่งรหัสผ่านไปกับทุก request ถ้าเป็น HTTP ธรรมดาจะถูกดักอ่านได้

## 9. ตั้งงานดึงข่าวรายวัน

```powershell
schtasks /Create /TN "PromptPilot News Fetch" /SC DAILY /ST 06:00 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\news-task.ps1"
```

ทดสอบรันทันทีหนึ่งครั้ง:

```powershell
schtasks /Run /TN "PromptPilot News Fetch"
```

รอ 1–3 นาทีแล้วดู log ของวันนี้ที่ `C:\Apps\PromptPilot\logs\news-YYYY-MM-DD.log` บรรทัดสุดท้ายต้องขึ้นต้นด้วย `✅`

- ข่าวที่ดึงมาจะอยู่สถานะ "รออนุมัติ" ยังไม่ขึ้นเว็บจนกว่าผู้ดูแลเนื้อหาจะอนุมัติในหน้า admin
- ผู้ดูแลเนื้อหากดปุ่มดึงข่าวเองจากหน้า admin ได้ด้วย ระบบกันไม่ให้รันซ้อนกัน

## 10. ตรวจรับงาน

| # | ทดสอบ | ผลที่ต้องได้ |
|---|---|---|
| 1 | เปิด `https://promptpilot.company.local/` | หน้าแรกขึ้น มีข่าวและรูปภาพ |
| 2 | เปิด `/news`, `/guides`, `/tools` | ขึ้นครบทุกหน้า |
| 3 | เปิด `/admin` | browser ขึ้นช่องให้ใส่ชื่อผู้ใช้/รหัสผ่าน |
| 4 | ใส่ `ADMIN_USER` / `ADMIN_PASSWORD` | เข้าหน้า admin ได้ |
| 5 | แก้ข้อมูลเล็กน้อยในหน้า admin แล้วกดบันทึก (แล้วแก้กลับ) | บันทึกสำเร็จ หน้าเว็บเปลี่ยนตาม |
| 6 | หน้า admin > ประวัติการดึงข่าว | เห็นรอบที่ทดสอบในขั้นที่ 9 สถานะสำเร็จ |
| 7 | รีสตาร์ตเครื่อง | เว็บกลับมาเองโดยไม่ต้องทำอะไร |

## 11. สำรองข้อมูล

สิ่งที่ต้องสำรองมีแค่ **ฐานข้อมูล** กับไฟล์ **`.env.local`** ส่วนโค้ดดึงใหม่จาก git ได้เสมอ

ตั้งสำรองฐานข้อมูลทุกคืน:

1. สร้างไฟล์ `C:\Apps\backup\my.cnf` (ล็อกสิทธิ์แบบเดียวกับ `.env.local`) เพื่อไม่ต้องใส่รหัสผ่านในคำสั่ง:
   ```ini
   [mysqldump]
   user=promptpilot
   password=รหัสผ่าน MySQL
   ```
2. สร้างสคริปต์ `C:\Apps\backup\backup-promptpilot.ps1`:
   ```powershell
   $out = "C:\Apps\backup\promptpilot-{0}.sql" -f (Get-Date -Format "yyyy-MM-dd")
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" --defaults-extra-file=C:\Apps\backup\my.cnf `
     --single-transaction --default-character-set=utf8mb4 --result-file=$out promptpilot
   # เก็บย้อนหลัง 30 วัน
   Get-ChildItem C:\Apps\backup\promptpilot-*.sql | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item
   ```
3. ตั้งเวลา:
   ```powershell
   schtasks /Create /TN "PromptPilot DB Backup" /SC DAILY /ST 02:00 /RU SYSTEM /F `
     /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\backup\backup-promptpilot.ps1"
   ```

กู้คืน: หยุดเว็บก่อน (`Stop-Service PromptPilot`) แล้วใช้คำสั่ง `mysql ... --execute="source ..."` แบบขั้นที่ 5 ทางเลือก A โดยชี้ไปที่ไฟล์ backup ที่ต้องการ จากนั้น `Start-Service PromptPilot`

## 12. อัปเดตเป็นเวอร์ชันใหม่

เมื่อผู้พัฒนาแจ้งว่ามีเวอร์ชันใหม่:

```powershell
Set-Location C:\Apps\PromptPilot
# 1) สำรองฐานข้อมูลก่อนเสมอ
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\backup\backup-promptpilot.ps1
# 2) ดึงโค้ด ติดตั้ง build
git pull
npm ci
npm run build
# 3) อัปเดตโครงสร้างตาราง
npm run db:migrate
# 4) รีสตาร์ตเว็บ
Restart-Service PromptPilot
```

- ถ้า `npm run build` ล้มเหลว เว็บเดิมยังทำงานต่อได้ตามปกติ (ยังไม่ได้รีสตาร์ต) ให้แจ้งผู้พัฒนาพร้อมข้อความ error
- **ย้อนกลับเวอร์ชัน:** `git log --oneline -5` เพื่อดูเวอร์ชันก่อนหน้า แล้ว `git checkout <รหัส commit>` → `npm ci` → `npm run build` → `Restart-Service PromptPilot`
  - ถ้าเวอร์ชันใหม่ไปเปลี่ยนโครงสร้างตารางด้วย ให้กู้ฐานข้อมูลจาก backup ที่ทำในข้อ 1 ด้วย

## 13. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| IIS ขึ้น 502.3 / Apache ขึ้น 503 | service PromptPilot ไม่ได้รัน | `Get-Service PromptPilot` แล้วดู `logs\web.log` |
| `logs\web.log` มี `ยังไม่ได้ตั้งค่าฐานข้อมูล` | ไม่เจอ `.env.local` | ตรวจว่า `AppDirectory` ของ NSSM เป็น `C:\Apps\PromptPilot` และไฟล์ชื่อ `.env.local` จริง (ไม่ใช่ `.env.local.txt`) |
| `ER_ACCESS_DENIED_ERROR` | ชื่อผู้ใช้/รหัสผ่าน MySQL ไม่ตรง | ตรวจ `DB_NAME`, `DB_PASS` (และ `DB_USER`) แล้ว `Restart-Service PromptPilot` |
| `ECONNREFUSED ...:3306` | MySQL ไม่ได้รัน หรือ host/port ผิด | ตรวจ service MySQL และ `DB_HOST`, `DB_PORT` |
| เข้า `/admin` แล้วไม่ขึ้นช่องรหัสผ่าน หรือขึ้นหน้า error ของ IIS | IIS เอาหน้า error ของตัวเองมาแทน หรือเปิด Windows Authentication ไว้ | ตรวจ `<httpErrors existingResponse="PassThrough" />` และ Authentication ของ Site (ขั้นที่ 8A) |
| ใส่รหัส admin ถูกแล้วยังเข้าไม่ได้ | `.env.local` ไม่มี `ADMIN_USER`/`ADMIN_PASSWORD` หรือแก้แล้วยังไม่รีสตาร์ต | แก้ไฟล์แล้ว `Restart-Service PromptPilot` |
| กดบันทึกในหน้า admin แล้วไม่เกิดอะไร / log มี `Invalid Server Actions request` | proxy ไม่ได้ส่ง Host header เดิม | IIS: `preserveHostHeader` (ขั้นที่ 8A ข้อ 2) / Apache: `ProxyPreserveHost On` |
| รูปไม่ขึ้น หรือ `/_next/image` ได้ 500 | `sharp` ไม่ใช่ของ Windows x64 | ลบโฟลเดอร์ `node_modules` แล้ว `npm ci` ใหม่บน server นี้ |
| `npm run build` ค้างหรือ error ตอนโหลดฟอนต์ | เครื่องออก `fonts.googleapis.com` ไม่ได้ | เปิด outbound หรือตั้ง proxy (ขั้นที่ 4) |
| log ข่าวขึ้น `ดึงข่าวไม่ได้เลยสักแหล่ง` | ออกอินเทอร์เน็ตไม่ได้ | ตรวจ firewall / proxy (ขั้นที่ 1 และ 4) |
| log ข่าวขึ้น `credit balance is too low` หรือ `insufficient_quota` | เครดิต API หมด | ระบบสลับไปใช้อีกเจ้าให้เองถ้ามี key อีกตัว ถ้าหมดทั้งคู่ให้แจ้งผู้ดูแลบัญชีเติมเครดิต |
| แก้ข้อมูลใน MySQL ตรงๆ แล้วหน้าเว็บไม่เปลี่ยน | เว็บเก็บ cache 10 นาที | รอ 10 นาที หรือ `Restart-Service PromptPilot` (แนะนำให้แก้ผ่านหน้า admin ซึ่งเห็นผลทันที) |

**ไฟล์ log**

- `C:\Apps\PromptPilot\logs\web.log`: log ของเว็บ
- `C:\Apps\PromptPilot\logs\news-YYYY-MM-DD.log`: log การดึงข่าวแต่ละวัน
- หน้า admin > ประวัติการดึงข่าว: ผลการดึงข่าวทุกรอบ
