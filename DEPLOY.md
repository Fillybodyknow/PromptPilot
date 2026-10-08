# คู่มือติดตั้ง PromptPilot บน Windows Server

สำหรับทีม IT Support ทำตามทีละขั้นจากบนลงล่างได้เลย ทุกคำสั่งให้รันใน **PowerShell แบบ Run as Administrator**

งานส่วนใหญ่ทำผ่านสคริปต์ที่มากับโปรเจกต์ IT ทำเองแค่ 4 อย่าง:

1. ติดตั้งซอฟต์แวร์พื้นฐาน
2. สร้างฐานข้อมูล
3. กรอกไฟล์ตั้งค่า
4. ตั้ง IIS หรือ Apache

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
               ──ทุกคืน 02:00──▶ สำรองฐานข้อมูลเป็นไฟล์ .sql
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
| โฟลเดอร์เก็บไฟล์สำรอง | `C:\Apps\backup` |

---

## 0. สิ่งที่ต้องได้จากผู้พัฒนาก่อนเริ่ม

| รายการ | ใช้ทำอะไร |
|---|---|
| สิทธิ์เข้าถึง repository `https://github.com/Fillybodyknow/PromptPilot` (ติดตั้งจาก branch `main`) | ดาวน์โหลดโค้ด |
| ไฟล์ `promptpilot-....sql` (สำรองฐานข้อมูลจากเครื่องผู้พัฒนา) | ย้ายข้อมูลปัจจุบัน (ข่าวที่อนุมัติแล้ว, เครื่องมือที่แก้ไว้) ขึ้น server ถ้าไม่มี ระบบจะใส่ข้อมูลตั้งต้นให้แทน |
| `ANTHROPIC_API_KEY` และ/หรือ `OPENAI_API_KEY` | ให้ AI สรุปข่าว ระบบใช้ Claude ก่อน ถ้าใช้ไม่ได้จะใช้ OpenAI แทน มีอย่างน้อย 1 ตัว |
| ชื่อผู้ใช้ของผู้ดูแลคนแรก | สคริปต์ติดตั้งจะถามชื่อและรหัสผ่านเพื่อสร้างบัญชีแรก แล้วคนนั้นเพิ่มคนอื่นเองในหน้า `/admin/users` |

> ส่ง API key และรหัสผ่านผ่านช่องทางที่ปลอดภัย (เช่น password manager ของบริษัท) ห้ามส่งทางแชตหรืออีเมลธรรมดา

**สำหรับผู้พัฒนา:** สร้างไฟล์สำรองจากเครื่องตัวเองด้วยสคริปต์เดียวกับที่ server ใช้ (ไม่ต้องเปิดแบบ Administrator):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1 -OutDir C:\Temp
```

## 1. สเปกเครื่องและเครือข่าย

- **ระบบปฏิบัติการ:** Windows Server 2019 / 2022 / 2025 (x64)
- **ทรัพยากร:** RAM ว่างอย่างน้อย 1 GB สำหรับแอป, พื้นที่ดิสก์ 3 GB (ไม่รวมไฟล์สำรอง)
- **การเชื่อมต่อขาออก (outbound HTTPS 443) ที่ต้องเปิด:**
  - ตอนติดตั้ง/อัปเดต: `registry.npmjs.org`, `github.com`, `fonts.googleapis.com`, `fonts.gstatic.com` (build ดาวน์โหลดฟอนต์)
  - ตอนใช้งาน: `api.anthropic.com`, `api.openai.com` และเว็บแหล่งข่าว เช่น `news.google.com`, `blog.google`, `deepmind.google`, `openai.com`, `huggingface.co`, `github.blog`, `github.com`, `aws.amazon.com`, `azure.microsoft.com`, `www.microsoft.com`, `cloudblog.withgoogle.com`, `www.blognone.com`
  - ผู้ดูแลเนื้อหาเพิ่มแหล่งข่าวใหม่ได้เองจากหน้า admin ถ้า firewall ใช้ allowlist ต้องเพิ่มโดเมนตามไปด้วย
- **ถ้าองค์กรออกอินเทอร์เน็ตผ่าน HTTP proxy:** ดูหัวข้อ "ใช้ผ่าน proxy ขององค์กร" ในขั้นที่ 4
- **ขาเข้า:** เปิดแค่ 443 (และ 80 ถ้าจะ redirect ไป HTTPS) ที่ IIS/Apache ส่วน port 3000 **ไม่ต้องเปิด** เพราะแอปรับเฉพาะจากเครื่องตัวเอง

## 2. ติดตั้งซอฟต์แวร์พื้นฐาน

1. **Node.js 24 LTS (x64)** จาก https://nodejs.org ติดตั้งด้วยไฟล์ `.msi` ค่าเริ่มต้นทั้งหมด (ให้เพิ่มเข้า PATH)
2. **Git for Windows** จาก https://git-scm.com
3. **MySQL Server 8.0 ขึ้นไป** ถ้ายังไม่มี (ใช้ MySQL ที่องค์กรมีอยู่แล้วก็ได้ ไม่จำเป็นต้องอยู่เครื่องเดียวกัน)
   - ถ้า MySQL อยู่เครื่องอื่น ให้ลง **MySQL client tools** บนเครื่องนี้ด้วย เพื่อให้มี `mysqldump.exe` ไว้สำรองข้อมูล
4. **NSSM** (ตัวช่วยรันโปรแกรมเป็น Windows Service) จาก https://nssm.cc/download แตกไฟล์แล้ววาง `win64\nssm.exe` ไว้ที่ `C:\Tools\nssm\nssm.exe`

ปิด PowerShell แล้วเปิดใหม่ (แบบ Administrator) แล้วตรวจ:

```powershell
node -v      # ต้องขึ้นต้นด้วย v24
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
- ตั้งชื่อผู้ใช้ให้ตรงกับชื่อฐานข้อมูล จะได้ไม่ต้องใส่ `DB_USER` ในไฟล์ตั้งค่า
- ถ้า MySQL อยู่คนละเครื่องกับแอป ให้เปลี่ยน `'localhost'` เป็น IP ของเครื่องแอป และเปิด port 3306 ระหว่างสองเครื่องเท่านั้น
- แอปต้องการสิทธิ์สร้าง/แก้ตารางด้วย (ใช้ตอนอัปเดตเวอร์ชัน) จึงให้ `ALL PRIVILEGES` เฉพาะฐานข้อมูลนี้

## 4. ดาวน์โหลดโค้ดและกรอกไฟล์ตั้งค่า

```powershell
New-Item -ItemType Directory -Force C:\Apps | Out-Null
git clone --branch main https://github.com/Fillybodyknow/PromptPilot.git C:\Apps\PromptPilot
Set-Location C:\Apps\PromptPilot
Copy-Item .env.example .env.local
notepad .env.local
```

กรอกค่าในไฟล์ตามคำอธิบายในไฟล์ แล้วบันทึก

> รหัสผ่านฐานข้อมูล (`DB_PASS`) **ห้ามมี** `$` `#` `"` `'` `` ` `` `\` และช่องว่าง และห้ามใส่เครื่องหมายคำพูดครอบค่า (สคริปต์ติดตั้งจะตรวจให้) ถ้ารหัสผ่าน MySQL ที่ตั้งในขั้นที่ 3 มีอักขระพวกนี้ ให้เปลี่ยนรหัสก่อน


| ค่า | ใส่อะไร |
|---|---|
| `DB_HOST`, `DB_PORT` | ที่อยู่ MySQL (ค่าเริ่มต้น `localhost`, `3306`) |
| `DB_NAME` | `promptpilot` |
| `DB_PASS` | รหัสผ่าน MySQL จากขั้นที่ 3 |
| `DB_USER` | เว้นว่าง ยกเว้นชื่อผู้ใช้ MySQL ไม่ใช่ชื่อเดียวกับ `DB_NAME` |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | API key จากผู้พัฒนา (มีอย่างน้อย 1 ตัว) |

> ห้าม commit หรือคัดลอกไฟล์ `.env.local` ไปที่อื่น สคริปต์ติดตั้งจะล็อกให้อ่านได้เฉพาะ Administrators และ SYSTEM

### ใช้ผ่าน proxy ขององค์กร

ข้ามหัวข้อนี้ได้ถ้าเครื่องออกอินเทอร์เน็ตได้ตรง ถ้าต้องผ่าน proxy ให้ตั้งค่าก่อนขั้นที่ 5:

```powershell
npm config set proxy http://proxy.company.local:8080
npm config set https-proxy http://proxy.company.local:8080
[Environment]::SetEnvironmentVariable("NODE_USE_ENV_PROXY", "1", "Machine")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://proxy.company.local:8080", "Machine")
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1", "Machine")
```

- 2 บรรทัดแรก: ให้ `npm` ดาวน์โหลด package ผ่าน proxy
- 3 บรรทัดหลัง: ให้เว็บและงานดึงข่าวออกเน็ตผ่าน proxy
  - ต้องตั้งเป็น environment variable ระดับเครื่อง เพราะ Node.js อ่านค่า proxy ตอนเริ่ม process ก่อนจะอ่าน `.env.local`
- สคริปต์ติดตั้งและสคริปต์อัปเดตจะส่งค่าเหล่านี้ให้ service และ build ให้เอง ไม่ต้องรีสตาร์ตเครื่อง

## 5. รันสคริปต์ติดตั้ง

**ถ้ามีไฟล์สำรองจากผู้พัฒนา (แนะนำ)** วางไฟล์ไว้ที่ `C:\Apps\` แล้วรัน (เปลี่ยนชื่อไฟล์ให้ตรง):

```powershell
powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\install.ps1 -SqlDump C:\Apps\promptpilot-2026-10-07_1647.sql
```

**ถ้าไม่มีไฟล์สำรอง** (เริ่มจากเครื่องมือและคู่มือตั้งต้น ยังไม่มีข่าว):

```powershell
powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\install.ps1
```

สคริปต์ใช้เวลาประมาณ 3–10 นาที และจะทำตามลำดับนี้ ถ้าขั้นไหนผิดพลาดจะหยุดพร้อมขึ้น `FAILED: ...` เป็นสีแดงบอกสาเหตุ

1. ตรวจว่ารันแบบ Administrator และมี Node.js 24, NSSM, `mysqldump.exe`
2. ตรวจว่า `.env.local` กรอกครบ แล้วล็อกสิทธิ์ไฟล์
3. ติดตั้ง package (`npm ci`)
4. นำเข้าไฟล์สำรอง (ถ้าใส่ `-SqlDump`) แล้วสร้าง/อัปเดตตาราง
   - ถ้าไม่ได้นำเข้าไฟล์สำรอง จะใส่ข้อมูลตั้งต้นให้
   - ฐานข้อมูลที่มีข้อมูลอยู่แล้วจะไม่ถูกเขียนทับ
5. **ถ้ายังไม่มีบัญชีผู้ดูแลเลย จะถามชื่อผู้ใช้และรหัสผ่าน** เพื่อสร้างบัญชีแรก (รหัสอย่างน้อย 10 ตัวอักษร และห้ามมีชื่อผู้ใช้อยู่ในรหัส) ส่งบัญชีนี้ให้ผู้ดูแลเนื้อหาทางช่องทางที่ปลอดภัย
   - ถ้านำเข้าไฟล์สำรองจากผู้พัฒนา บัญชีที่ผู้พัฒนาสร้างไว้จะติดมาด้วย และจะไม่ถามข้อนี้
6. build เว็บ
7. ติดตั้ง Windows Service ชื่อ `PromptPilot` (เปิดเองเมื่อเครื่องรีสตาร์ต และเปิดใหม่เองถ้าล่ม) แล้วตรวจว่าเว็บตอบ 200
8. ตั้ง Task Scheduler 2 งาน:
   - `PromptPilot News Fetch`: ดึงข่าวทุกวัน 06:00
   - `PromptPilot DB Backup`: สำรองฐานข้อมูลทุกคืน 02:00 ไปที่ `C:\Apps\backup` เก็บย้อนหลัง 30 วัน

จบแล้วต้องขึ้น `Installation complete.` สีเขียว

ตัวเลือกเพิ่มเติม (ใส่ต่อท้ายคำสั่งได้):

| ตัวเลือก | ค่าเริ่มต้น | ใช้เมื่อ |
|---|---|---|
| `-Port 3100` | `3000` | port 3000 ถูกโปรแกรมอื่นใช้อยู่ (ต้องแก้ reverse proxy ในขั้นที่ 6 ให้ตรงด้วย) |
| `-Nssm D:\Tools\nssm.exe` | `C:\Tools\nssm\nssm.exe` | วาง NSSM ไว้ที่อื่น |
| `-FetchTime 07:30` | `06:00` | อยากเปลี่ยนเวลาดึงข่าว |
| `-BackupDir D:\Backup\PromptPilot` | `C:\Apps\backup` | อยากเก็บไฟล์สำรองที่อื่น |
| `-MysqlBin "C:\Program Files\MySQL\MySQL Server 8.0\bin"` | หาเองใน `C:\Program Files\MySQL` | ลง MySQL ไว้ที่อื่น |

**รันซ้ำได้:** ถ้าแก้ `.env.local` หรือแก้ตัวเลือกข้างบน ให้รันสคริปต์เดิมอีกครั้ง (ไม่ต้องใส่ `-SqlDump` ซ้ำ) ระบบจะตั้งค่าใหม่ทั้งหมด โดยข้อมูลในฐานข้อมูลไม่หาย ถ้าการรันซ้ำล้มเหลวกลางทาง สคริปต์จะเปิดเว็บเดิมกลับมาให้

สคริปต์จะจำกัดสิทธิ์โฟลเดอร์ `C:\Apps\PromptPilot` และ `C:\Appsackup` ให้เฉพาะ Administrators และ SYSTEM เพราะ service และงานตามเวลารันเป็น SYSTEM ถ้าผู้ใช้ทั่วไปวางไฟล์ในโฟลเดอร์นี้ได้ ก็จะสั่งให้ SYSTEM รันโปรแกรมได้

ถ้าจะให้เว็บอยู่ใต้ path ย่อย เช่น `https://intranet.company.local/promptpilot` แทนการใช้โดเมนของตัวเอง ให้ตั้ง `[Environment]::SetEnvironmentVariable("NEXT_PUBLIC_BASE_PATH", "/promptpilot", "Machine")` ก่อนรันสคริปต์ และแจ้งผู้พัฒนาด้วย

## 6. ตั้ง Reverse Proxy

เลือกตามที่ server ใช้ **IIS หรือ Apache อย่างใดอย่างหนึ่ง**

จุดที่ต้องตั้งให้ถูก ไม่อย่างนั้น login และการบันทึกในหน้า admin จะใช้ไม่ได้: **ส่ง Host header เดิมต่อให้แอป** แอปตรวจว่าคำขอ login และบันทึกข้อมูลมาจากโดเมนเดียวกัน (กัน CSRF) ถ้า proxy เปลี่ยน Host เป็น `127.0.0.1:3000` จะถูกปฏิเสธ

### 6A. IIS

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
       <!-- ส่งหน้า 404/500 ของแอปผ่านไปตรงๆ แทนหน้า error ของ IIS -->
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

### 6B. Apache (httpd บน Windows)

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

> ใช้ HTTPS เสมอ เพราะหน้า login ส่งรหัสผ่าน และ cookie ของ session ใช้แทนการ login ได้ ถ้าเป็น HTTP ธรรมดาจะถูกดักอ่านได้

## 7. ทดสอบดึงข่าวและตรวจรับงาน

สั่งดึงข่าวทันทีหนึ่งรอบ:

```powershell
Start-ScheduledTask -TaskName "PromptPilot News Fetch"
```

รอ 1–3 นาทีแล้วเปิด log ของวันนี้ที่ `C:\Apps\PromptPilot\logs\news-YYYY-MM-DD.log` บรรทัดสุดท้ายต้องขึ้นต้นด้วย `✅`

- ข่าวที่ดึงมาจะอยู่สถานะ "รออนุมัติ" ยังไม่ขึ้นเว็บจนกว่าผู้ดูแลเนื้อหาจะอนุมัติในหน้า admin
- ผู้ดูแลเนื้อหากดปุ่มดึงข่าวเองจากหน้า admin ได้ด้วย ระบบกันไม่ให้รันซ้อนกัน

ตรวจรับงาน:

| # | ทดสอบ | ผลที่ต้องได้ |
|---|---|---|
| 1 | เปิด `https://promptpilot.company.local/` | หน้าแรกขึ้น มีข่าวและรูปภาพ |
| 2 | เปิด `/news`, `/guides`, `/tools` | ขึ้นครบทุกหน้า |
| 3 | เปิด `/admin` | ถูกส่งไปหน้า "เข้าสู่ระบบผู้ดูแล" |
| 4 | login ด้วยบัญชีที่สร้างตอนติดตั้ง | เข้าหน้า admin ได้ มีชื่อผู้ใช้และปุ่ม "ออกจากระบบ" มุมขวา |
| 5 | แก้ข้อมูลเล็กน้อยในหน้า admin แล้วกดบันทึก (แล้วแก้กลับ) | บันทึกสำเร็จ หน้าเว็บเปลี่ยนตาม |
| 6 | หน้า admin > ประวัติการดึงข่าว | เห็นรอบที่เพิ่งทดสอบ สถานะสำเร็จ |
| 7 | `Start-ScheduledTask -TaskName "PromptPilot DB Backup"` แล้วดู `C:\Apps\backup` | มีไฟล์ `promptpilot-....sql` ใหม่ |
| 8 | รีสตาร์ตเครื่อง | เว็บกลับมาเองโดยไม่ต้องทำอะไร |

## 8. สำรองและกู้คืนข้อมูล

สิ่งที่ต้องสำรองมีแค่ **ฐานข้อมูล** กับไฟล์ **`.env.local`** ส่วนโค้ดดึงใหม่จาก git ได้เสมอ

- **ฐานข้อมูล:** งาน `PromptPilot DB Backup` สำรองให้ทุกคืนไปที่ `C:\Apps\backup` อยู่แล้ว ควรให้ระบบ backup ขององค์กรเก็บโฟลเดอร์นี้ไปไว้นอกเครื่องด้วย
- **`.env.local`:** เก็บสำเนาไว้ใน password manager ขององค์กร

สำรองทันทีด้วยมือ:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\backup-db.ps1
```

กู้คืนจากไฟล์สำรอง (ทุกตารางในฐานข้อมูลจะถูกลบแล้วสร้างใหม่จากไฟล์ ข้อมูลปัจจุบันหายทั้งหมด):

```powershell
Set-Location C:\Apps\PromptPilot
Stop-Service PromptPilot
npx tsx scripts/db/import-dump.ts C:\Apps\backup\promptpilot-2026-10-07_0200.sql --force
npm run db:migrate
Start-Service PromptPilot
```

## 9. อัปเดตเป็นเวอร์ชันใหม่

เมื่อผู้พัฒนาแจ้งว่ามีเวอร์ชันใหม่ รันคำสั่งเดียว:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\update.ps1
```

สคริปต์จะทำตามลำดับ:

1. สำรองฐานข้อมูลก่อน ถ้าสำรองไม่ได้จะหยุดโดยไม่แตะอะไร
2. ดึงโค้ดล่าสุด ถ้าไม่มีเวอร์ชันใหม่จะจบตรงนี้
3. หยุดเว็บ แล้วติดตั้ง package และ build (เว็บหยุดประมาณ 1–3 นาที)
4. อัปเดตตาราง
5. เปิดเว็บ แล้วตรวจว่าตอบ 200

**ถ้าขั้นไหนผิดพลาด** สคริปต์จะคืนเว็บเป็นเวอร์ชันเดิมและเปิดกลับมาให้เอง แล้วขึ้นข้อความ error สีแดง ให้ส่งข้อความนั้นให้ผู้พัฒนา ถ้ารันซ้ำแล้วไม่มีเวอร์ชันใหม่แต่เว็บยังไม่ทำงาน สคริปต์จะ build และเปิดเว็บใหม่ให้

ไม่ต้องใส่ port หรือที่เก็บไฟล์สำรอง สคริปต์อ่านค่าที่ตั้งไว้ตอนติดตั้งเอง

## 10. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| `install.ps1` ขึ้น `Run PowerShell as Administrator` | ไม่ได้เปิด PowerShell แบบ Administrator | คลิกขวา PowerShell > Run as Administrator |
| `install.ps1` ขึ้น `Empty in .env.local: ...` | ยังไม่ได้กรอกค่าตามที่บอก | กรอกใน `.env.local` แล้วรันใหม่ |
| `install.ps1` ขึ้น `มีตารางอยู่แล้ว ... ไม่นำเข้า` | ฐานข้อมูลมีข้อมูลอยู่แล้ว สคริปต์จึงไม่เขียนทับ | ถ้าตั้งใจแทนที่ทั้งหมด ใช้วิธีกู้คืนในขั้นที่ 8 ถ้าไม่ได้ตั้งใจ ให้รันใหม่โดยไม่ใส่ `-SqlDump` |
| IIS ขึ้น 502.3 / Apache ขึ้น 503 | service PromptPilot ไม่ได้รัน | `Get-Service PromptPilot` แล้วดู `logs\web.log` |
| `ER_ACCESS_DENIED_ERROR` | ชื่อผู้ใช้/รหัสผ่าน MySQL ไม่ตรง | ตรวจ `DB_NAME`, `DB_PASS` (และ `DB_USER`) แล้ว `Restart-Service PromptPilot` |
| `ECONNREFUSED ...:3306` | MySQL ไม่ได้รัน หรือ host/port ผิด | ตรวจ service MySQL และ `DB_HOST`, `DB_PORT` |
| เข้า `/admin` แล้วขึ้นหน้า login ของ Windows หรือหน้า error ของ IIS | เปิด Windows Authentication ไว้ที่ Site | เปิด Anonymous Authentication อย่างเดียว (ขั้นที่ 6A ข้อ 4) |
| กด "เข้าสู่ระบบ" หรือกดบันทึกในหน้า admin แล้วไม่เกิดอะไร / log มี `Invalid Server Actions request` | proxy ไม่ได้ส่ง Host header เดิม | IIS: `preserveHostHeader` (ขั้นที่ 6A ข้อ 2) / Apache: `ProxyPreserveHost On` |
| login ผ่านแต่ถูกส่งกลับหน้า login ทุกครั้ง | เปิดเว็บผ่าน HTTP ธรรมดา browser จึงไม่เก็บ cookie | เปิดผ่าน `https://` (ขั้นที่ 6) |
| ขึ้น `บัญชีถูกล็อก 15 นาที` | ใส่รหัสผิด 5 ครั้งติดกัน | รอ 15 นาที หรือให้ผู้ดูแลคนอื่นกด "ตั้งรหัสผ่านใหม่" ในหน้า `/admin/users` |
| ลืมรหัส / ไม่มีใครเข้า admin ได้เลย | — | บน server: `Set-Location C:\Apps\PromptPilot` แล้ว `npm run user:password -- <ชื่อผู้ใช้>` (ตั้งรหัสใหม่และปลดล็อก) หรือ `npm run user:create -- <ชื่อใหม่>` / ดูรายชื่อด้วย `npm run user:list` |
| รูปไม่ขึ้น หรือ `/_next/image` ได้ 500 | `node_modules` ถูกคัดลอกมาจากเครื่องอื่น | ลบโฟลเดอร์ `node_modules` แล้วรัน `install.ps1` ใหม่ |
| build ค้างหรือ error ตอนโหลดฟอนต์ | เครื่องออก `fonts.googleapis.com` ไม่ได้ | เปิด outbound หรือตั้ง proxy (ขั้นที่ 4) |
| log ข่าวขึ้น `ดึงข่าวไม่ได้เลยสักแหล่ง` | ออกอินเทอร์เน็ตไม่ได้ | ตรวจ firewall / proxy (ขั้นที่ 1 และ 4) |
| log ข่าวขึ้น `credit balance is too low` หรือ `insufficient_quota` | เครดิต API หมด | ระบบสลับไปใช้อีกเจ้าให้เองถ้ามี key อีกตัว ถ้าหมดทั้งคู่ให้แจ้งผู้ดูแลบัญชีเติมเครดิต |
| `backup-db.ps1` ขึ้น `mysqldump.exe not found` | ไม่มี MySQL client tools บนเครื่องนี้ | ลง MySQL client tools หรือใส่ `-MysqlBin <โฟลเดอร์ bin>` |
| แก้ข้อมูลใน MySQL ตรงๆ แล้วหน้าเว็บไม่เปลี่ยน | เว็บเก็บ cache 10 นาที | รอ 10 นาที หรือ `Restart-Service PromptPilot` (แนะนำให้แก้ผ่านหน้า admin ซึ่งเห็นผลทันที) |

**ไฟล์ log**

- `C:\Apps\PromptPilot\logs\web.log`: log ของเว็บ
- `C:\Apps\PromptPilot\logs\news-YYYY-MM-DD.log`: log การดึงข่าวแต่ละวัน
- หน้า admin > ประวัติการดึงข่าว: ผลการดึงข่าวทุกรอบ

---

## ภาคผนวก: ติดตั้งด้วยมือ (ใช้เมื่อสคริปต์ใช้ไม่ได้)

สิ่งที่ `install.ps1` ทำ ถ้าต้องทำเองทีละขั้น (หลังขั้นที่ 4):

```powershell
Set-Location C:\Apps\PromptPilot

# ติดตั้ง package — ห้ามใส่ --omit=dev เพราะสคริปต์ดึงข่าวและ migrate ใช้ tsx กับ drizzle-kit
npm ci

# ฐานข้อมูล: นำเข้าไฟล์สำรอง (ถ้ามี) แล้วสร้าง/อัปเดตตาราง และใส่ข้อมูลตั้งต้นถ้ายังว่าง
npx tsx scripts/db/import-dump.ts C:\Apps\promptpilot-....sql
npm run db:migrate
npm run db:seed

# build
npm run build

# Windows Service
$nssm = "C:\Tools\nssm\nssm.exe"
New-Item -ItemType Directory -Force C:\Apps\PromptPilot\logs | Out-Null
& $nssm install PromptPilot "C:\Program Files\nodejs\node.exe"
& $nssm set PromptPilot AppParameters "node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3000"
& $nssm set PromptPilot AppDirectory "C:\Apps\PromptPilot"
& $nssm set PromptPilot Start SERVICE_AUTO_START
& $nssm set PromptPilot AppStdout "C:\Apps\PromptPilot\logs\web.log"
& $nssm set PromptPilot AppStderr "C:\Apps\PromptPilot\logs\web.log"
& $nssm start PromptPilot

# งานดึงข่าวทุกวัน 06:00
schtasks /Create /TN "PromptPilot News Fetch" /SC DAILY /ST 06:00 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\news-task.ps1"

# งานสำรองฐานข้อมูลทุกคืน 02:00
schtasks /Create /TN "PromptPilot DB Backup" /SC DAILY /ST 02:00 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\backup-db.ps1"
```

- `AppDirectory` ต้องเป็นโฟลเดอร์โปรเจกต์ เพราะแอปอ่าน `.env.local` และเขียน `logs\` จากโฟลเดอร์ที่รันอยู่
- ต้องรัน `npm ci` บน server เครื่องนี้เอง ห้ามคัดลอก `node_modules` มาจากเครื่องอื่น เพราะตัวย่อรูป (`sharp`) ต้องเป็นของ Windows x64
- ถ้าองค์กรกำหนดให้ service ใช้ service account แยกแทน LocalSystem บัญชีนั้นต้องอ่าน `.env.local` และเขียน `C:\Apps\PromptPilot\logs` กับ `C:\Apps\PromptPilot\.next` ได้
