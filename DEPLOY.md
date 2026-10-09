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
Task Scheduler ──ทุกวัน 07:00──▶ เปิดหน้าทางการของเครื่องมือ → ให้ AI เทียบข้อมูล → ข้อเสนอแก้ไขรอคนอนุมัติ
               ──ทุกคืน 02:00──▶ สำรองฐานข้อมูลเป็นไฟล์ .sql
```

- เว็บเป็นแอป Node.js ไม่ใช่ไฟล์ static จึงต้องรัน process ค้างไว้ตลอด แล้วให้ IIS/Apache ส่งต่อ request เข้ามา
- ข้อมูลทั้งหมด (เครื่องมือ, คู่มือ, ข่าว) อยู่ใน MySQL ผู้ดูแลเนื้อหาแก้ผ่านหน้า `/admin` ของเว็บเอง ไม่ต้องแก้ไฟล์บน server
- **ทั้งเว็บต้อง login ด้วย Microsoft 365 ของบริษัท** — พนักงานเข้าอ่านได้ทันที บัญชีภายนอกบริษัทเข้าไม่ได้ บัญชี guest ต้องรอผู้ดูแลระบบอนุมัติ และเว็บถูกตั้งไม่ให้ search engine เก็บ

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
| ชื่อ login Microsoft 365 (UPN) ของผู้ดูแลระบบคนแรก | ใส่ใน `ADMIN_EMAILS` — คนแรกในรายชื่อที่ login จะเป็นผู้ดูแลระบบทันที แล้วอนุมัติคนอื่นเองในหน้า `/admin/users` |

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
  - ตอนใช้งาน: `login.microsoftonline.com` (เข้าสู่ระบบหน้า admin), `api.anthropic.com`, `api.openai.com` และเว็บแหล่งข่าว เช่น `news.google.com`, `blog.google`, `deepmind.google`, `openai.com`, `huggingface.co`, `github.blog`, `github.com`, `aws.amazon.com`, `azure.microsoft.com`, `www.microsoft.com`, `cloudblog.withgoogle.com`, `www.blognone.com`
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

## 3.5 ลงทะเบียนแอปใน Microsoft Entra ID (ให้ผู้ดูแล Microsoft 365 ทำ)

ทั้งเว็บ login ด้วยบัญชี Microsoft 365 ของบริษัทเท่านั้น จึงต้องลงทะเบียนแอปก่อน 1 ครั้ง

1. เข้า https://entra.microsoft.com ด้วยบัญชีที่มีสิทธิ์ Application Administrator ขึ้นไป
2. **Identity > Applications > App registrations > New registration**
   - **Name:** `PromptPilot`
   - **Supported account types:** *Accounts in this organizational directory only* (Single tenant) — บัญชีส่วนตัวหรือของบริษัทอื่นจะ login ไม่ได้
   - **Redirect URI:** เลือก **Web** แล้วใส่ `https://promptpilot.company.local/auth/microsoft/callback` (ใช้ชื่อเว็บจริง ต้องตรงกับ `APP_URL` ทุกตัวอักษร ถ้าเว็บอยู่ใต้ path ย่อยให้ใส่ path นั้นด้วย เช่น `https://intranet.company.local/promptpilot/auth/microsoft/callback`)
   - กด **Register**
3. หน้า **Overview** ของแอป: จด **Directory (tenant) ID** และ **Application (client) ID**
4. **Certificates & secrets > Client secrets > New client secret**: ตั้งอายุ (สูงสุด 24 เดือน) แล้วจด **Value** ทันที (แสดงครั้งเดียว — ไม่ใช่ Secret ID)
5. **API permissions:** ใช้ค่าเริ่มต้น `Microsoft Graph > User.Read` ได้เลย (ระบบขอแค่ `openid`, `profile`, `email`) ไม่ต้องขอสิทธิ์อื่น
   - จากนั้นกด **Grant admin consent for (ชื่อบริษัท)** แล้วกด Yes ให้ช่อง Status ขึ้น "Granted for …" สีเขียว — ถ้าบริษัทไม่อนุญาตให้พนักงานยินยอมแอปเอง (ค่าที่พบบ่อย) พนักงานจะติดหน้า "ต้องการการอนุมัติของผู้ดูแลระบบ" ตอน login จนกว่าจะกดปุ่มนี้ กดครั้งเดียวมีผลกับทุกคน ไม่ต้องอนุมัติรายคน
6. (ไม่บังคับ) **Enterprise applications > PromptPilot > Properties > Assignment required = Yes** แล้วเพิ่มเฉพาะคนหรือกลุ่มที่อนุญาต — คนอื่นจะส่งคำขอเข้าใช้งานไม่ได้ตั้งแต่แรก

> **ลงปฏิทินต่ออายุ Client secret** ก่อนวันหมดอายุ ถ้าหมดอายุ จะไม่มีใครเข้าหน้า admin ได้ (หน้าเว็บสาธารณะไม่กระทบ) วิธีต่อ: สร้าง secret ใหม่ในข้อ 4 → แก้ `MS_CLIENT_SECRET` ใน `.env.local` → `Restart-Service PromptPilot` → ลบ secret เก่า
>
> ถ้าผู้พัฒนาจะทดสอบบนเครื่องตัวเอง ให้เพิ่ม Redirect URI `http://localhost:3000/auth/microsoft/callback` ในแอปเดียวกัน หรือแยกแอปสำหรับทดสอบ

## 3.6 (ไม่บังคับ) เปิดรับบัญชีภายนอกบริษัท

ปกติเว็บรับเฉพาะบัญชี Microsoft 365 ของบริษัท ถ้าต้องการให้คนนอก (บัญชีองค์กรอื่น หรือบัญชี Microsoft ส่วนตัวเช่น outlook.com) login มาขอเข้าใช้ได้ โดย**ทุกคนที่ไม่ใช่พนักงานต้องรอผู้ดูแลระบบของ PromptPilot อนุมัติ**:

1. ใน App registration ของ PromptPilot > **Authentication** > **Supported account types** เลือก *Accounts in any organizational directory and personal Microsoft accounts* แล้ว Save
   - ถ้าบันทึกไม่ได้ ให้แก้ใน **Manifest**: `"requestedAccessTokenVersion": 2` (ใน `api`) แล้วตั้ง `"signInAudience": "AzureADandPersonalMicrosoftAccount"`
2. ใน `.env.local` ใส่ `MS_ALLOW_EXTERNAL=true` และ `MS_TENANT_ID` ต้องเป็น **GUID** (Directory (tenant) ID) ไม่ใช่ชื่อโดเมน แล้ว `Restart-Service PromptPilot`

ข้อควรรู้ก่อนเปิด:
- **ใครก็ส่งคำขอเข้ามาได้** และชื่อกับอีเมลของบัญชีภายนอก**เจ้าของตั้งเองได้** ผู้อนุมัติต้องยืนยันตัวตนกับเจ้าของจริงนอกระบบก่อนกดอนุมัติ
  - หน้าผู้ใช้จะแสดงประเภทบัญชี, tenant ที่มา และเตือน "ชื่อ/อีเมลซ้ำกับผู้ใช้อื่น" ถ้ามีคนพยายามใช้ชื่อเดียวกับคนที่มีอยู่
  - ชื่อและอีเมลที่บันทึกคือค่าตอนส่งคำขอ ไม่เปลี่ยนตามบัญชีภายหลัง และในบันทึกการแก้ไขจะต่อท้ายว่า "(ภายนอก)"
- **กันคำขอขยะ:** รับคำขอค้างได้รวม 200 รายการ, จากองค์กรเดียวกันไม่เกิน 5, จากบัญชีส่วนตัวรวมไม่เกิน 30 และคำขอที่ค้างเกิน 30 วันถูกลบเอง (พนักงานไม่ถูกจำกัด) ถ้าถูกส่งคำขอขยะจากองค์กรเดียว กด "ปฏิเสธทั้งหมดจากองค์กรนี้" ในหน้าผู้ใช้ได้
- **guest เดิมต้องอนุมัติใหม่:** เมื่อเปิดโหมดนี้ guest ที่บริษัทเคยเชิญจะ login ผ่านบัญชีขององค์กรตัวเอง จึงเข้ามาเป็นคำขอใหม่แบบ "บัญชีองค์กรอื่น" ส่วน guest ที่ใช้รหัสทางอีเมล (one-time passcode), Google หรือ SAML จะ login ไม่ได้ในโหมดนี้
- **ผู้ใช้จากบริษัทอื่นอาจกดยินยอมแอปไม่ได้:** Microsoft ไม่ให้ผู้ใช้ในองค์กรอื่นยินยอมแอปหลาย tenant ที่ผู้เผยแพร่ยังไม่ยืนยันตัวตน (ค่าเริ่มต้นของ Microsoft) ทางแก้คือให้ IT ของบริษัทนั้นกดอนุมัติแอปให้ หรือบริษัทเราทำ [Publisher verification](https://learn.microsoft.com/entra/identity-platform/publisher-verification-overview) ซึ่งต้องมี Microsoft Partner Center (MPN) ID และโดเมนของบริษัทที่ยืนยันแล้ว ส่วนบัญชี Microsoft ส่วนตัวกดยินยอมเองได้
- `ADMIN_EMAILS` ใช้ได้กับบัญชีพนักงานเท่านั้น
- ใช้กับ Microsoft cloud ปกติเท่านั้น (ถ้าตั้ง `MS_AUTHORITY` เป็น cloud พิเศษ โหมดนี้จะ login ไม่ได้)

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
| `APP_URL` | ที่อยู่เว็บที่ผู้ใช้เปิดจริง เช่น `https://promptpilot.company.local` (ไม่มี `/` ท้าย) |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` | จากขั้นที่ 3.5 |
| `ADMIN_EMAILS` | ชื่อ login Microsoft (UPN) ของผู้ดูแลระบบคนแรก คั่นด้วย `,` เช่น `somchai@company.com,suda@company.com` มีผลเฉพาะตอนที่ยังไม่มีผู้ดูแลระบบสักคน (ติดตั้งครั้งแรก หรือกู้คืน) — หลังจากนั้นคนในรายชื่อก็ต้องรออนุมัติเหมือนคนอื่น |

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
5. build เว็บ
6. ติดตั้ง Windows Service ชื่อ `PromptPilot` (เปิดเองเมื่อเครื่องรีสตาร์ต และเปิดใหม่เองถ้าล่ม) แล้วตรวจว่าเว็บตอบ 200
7. ตั้ง Task Scheduler 3 งาน:
   - `PromptPilot News Fetch`: ดึงข่าวทุกวัน 06:00
   - `PromptPilot Content Check`: ให้ AI ตรวจข้อมูลทุกวัน 07:00 (เครื่องมือที่มีข่าวใหม่ทุกวัน, ข้อมูลเก่าสัปดาห์ละครั้ง, ทบทวนคู่มือเดือนละครั้ง) ผลเป็นข้อเสนอแก้ไขที่ต้องมีคนอนุมัติ ไม่แก้ข้อมูลบนเว็บเอง
   - `PromptPilot DB Backup`: สำรองฐานข้อมูลทุกคืน 02:00 ไปที่ `C:\Apps\backup` เก็บย้อนหลัง 30 วัน

จบแล้วต้องขึ้น `Installation complete.` สีเขียว

ตัวเลือกเพิ่มเติม (ใส่ต่อท้ายคำสั่งได้):

| ตัวเลือก | ค่าเริ่มต้น | ใช้เมื่อ |
|---|---|---|
| `-Port 3100` | `3000` | port 3000 ถูกโปรแกรมอื่นใช้อยู่ (ต้องแก้ reverse proxy ในขั้นที่ 6 ให้ตรงด้วย) |
| `-Nssm D:\Tools\nssm.exe` | `C:\Tools\nssm\nssm.exe` | วาง NSSM ไว้ที่อื่น |
| `-FetchTime 07:30` | `06:00` | อยากเปลี่ยนเวลาดึงข่าว |
| `-CheckTime 08:00` | `07:00` | อยากเปลี่ยนเวลาที่ AI ตรวจข้อมูลเครื่องมือ (ควรหลังเวลาดึงข่าว) |
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
| 1 | เปิด `https://promptpilot.company.local/` (ยังไม่ login) | ถูกส่งไปหน้า "เข้าสู่ระบบ PromptPilot" มีปุ่ม "เข้าสู่ระบบด้วย Microsoft" |
| 2 | กดปุ่มแล้ว login ด้วยบัญชีแรกที่อยู่ใน `ADMIN_EMAILS` | กลับมาหน้าแรก มีข่าวและรูปภาพ มุมขวาบนมีปุ่ม "Admin" และชื่อผู้ใช้ (กดแล้วเห็นอีเมลและสิทธิ์ "ผู้ดูแลระบบ") |
| 3 | เปิด `/news`, `/guides`, `/tools`, `/admin` | ขึ้นครบทุกหน้า |
| 4 | ให้พนักงานอีกคน login | อ่านเว็บได้ทันทีในสิทธิ์ "ผู้อ่าน" ไม่มีปุ่ม Admin ถ้าจะให้ช่วยดูแลเนื้อหา ผู้ดูแลระบบเปลี่ยนสิทธิ์ในหน้า `/admin/users` |
| 4.1 | เปิด `https://promptpilot.company.local/robots.txt` | ขึ้น `Disallow: /` (ไม่ให้ search engine เก็บ) |
| 5 | แก้ข้อมูลเล็กน้อยในหน้า admin แล้วกดบันทึก (แล้วแก้กลับ) | บันทึกสำเร็จ หน้าเว็บเปลี่ยนตาม |
| 6 | หน้า admin > ประวัติการดึงข่าว | เห็นรอบที่เพิ่งทดสอบ สถานะสำเร็จ |
| 6.1 | `Start-ScheduledTask -TaskName "PromptPilot Content Check"` รอ 1–5 นาที แล้วเปิดหน้า admin > ข้อเสนอแก้ไขจาก AI | ส่วน "การตรวจล่าสุด" ท้ายหน้ามีรอบที่เพิ่งรัน สถานะเสร็จ (log อยู่ที่ `logs\content-YYYY-MM-DD.log`) |
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
6. ถ้ายังไม่มีงาน `PromptPilot Content Check` (server ที่ติดตั้งก่อนมีฟีเจอร์ AI ตรวจข้อมูลเครื่องมือ) จะสร้างให้ ตั้งเวลา 07:00 ทุกวัน

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
| login ผ่านแต่ถูกส่งกลับหน้า login ทุกครั้ง | เปิดเว็บผ่าน HTTP ธรรมดา browser จึงไม่เก็บ cookie | เปิดผ่าน `https://` และตั้ง `APP_URL` เป็น `https://...` |
| หน้า Microsoft ขึ้น "ต้องการการอนุมัติของผู้ดูแลระบบ" / "Need admin approval" (`AADSTS90094` / `AADSTS65001`) | บริษัทไม่ให้พนักงานยินยอมแอปเอง และยังไม่ได้กด admin consent | ผู้ดูแล Microsoft 365 กด **Grant admin consent** (ขั้นที่ 3.5 ข้อ 5) ครั้งเดียวสำหรับทั้งบริษัท |
| หน้า Microsoft ขึ้น `AADSTS50011` (redirect URI mismatch) | Redirect URI ในขั้นที่ 3.5 ไม่ตรงกับ `APP_URL` | แก้ให้ตรงทุกตัวอักษร: `<APP_URL>/auth/microsoft/callback` |
| หน้า Microsoft ขึ้น `AADSTS7000215` / `AADSTS7000222` | Client secret ผิดหรือหมดอายุ | สร้าง secret ใหม่ (ขั้นที่ 3.5 ข้อ 4) แก้ `MS_CLIENT_SECRET` แล้ว `Restart-Service PromptPilot` |
| ขึ้น "ยังไม่ได้ตั้งค่า Microsoft login" | `.env.local` ไม่มี `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` | กรอกแล้ว `Restart-Service PromptPilot` |
| ขึ้น "เชื่อมต่อ Microsoft ไม่ได้" | server ออกไป `login.microsoftonline.com` ไม่ได้ | เปิด outbound หรือตั้ง proxy (ขั้นที่ 4) |
| ขึ้น "เข้าสู่ระบบไม่สำเร็จ" | ดูรายละเอียดใน `logs\web.log` บรรทัดที่ขึ้นต้นด้วย `[auth]` | เช่น บัญชีไม่ได้อยู่ใน tenant ของบริษัท หรือเวลาเครื่อง server คลาดเคลื่อน (ตั้ง time sync) |
| ไม่มีผู้ดูแลระบบเหลือ / ผู้ดูแลระบบถูกปิดใช้หมด | — | ใส่ UPN ของคนที่จะเป็นผู้ดูแลระบบใน `ADMIN_EMAILS` แล้ว `Restart-Service PromptPilot` คนนั้น login ด้วย Microsoft จะเป็นผู้ดูแลระบบ (ใช้ได้เพราะตอนนั้นไม่มีผู้ดูแลระบบเหลือ) ดูรายชื่อผู้ใช้ด้วย `npm run user:list` |
| พนักงานลาออก | — | ปิดบัญชีใน Microsoft 365 ก็ login ไม่ได้แล้ว แต่ควรกด "ปิดใช้" ในหน้า `/admin/users` ด้วย เพื่อตัด session ที่ยังค้างอยู่ทันที |
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

# งาน AI ตรวจข้อมูลเครื่องมือทุกวัน 07:00
schtasks /Create /TN "PromptPilot Content Check" /SC DAILY /ST 07:00 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\content-task.ps1"

# งานสำรองฐานข้อมูลทุกคืน 02:00
schtasks /Create /TN "PromptPilot DB Backup" /SC DAILY /ST 02:00 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\backup-db.ps1"
```

- `AppDirectory` ต้องเป็นโฟลเดอร์โปรเจกต์ เพราะแอปอ่าน `.env.local` และเขียน `logs\` จากโฟลเดอร์ที่รันอยู่
- ต้องรัน `npm ci` บน server เครื่องนี้เอง ห้ามคัดลอก `node_modules` มาจากเครื่องอื่น เพราะตัวย่อรูป (`sharp`) ต้องเป็นของ Windows x64
- ถ้าองค์กรกำหนดให้ service ใช้ service account แยกแทน LocalSystem บัญชีนั้นต้องอ่าน `.env.local` และเขียน `C:\Apps\PromptPilot\logs` กับ `C:\Apps\PromptPilot\.next` ได้
