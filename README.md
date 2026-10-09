# PromptPilot

เว็บภายในบริษัทสำหรับ **ข่าว AI ที่องค์กรต้องรู้** และ **คู่มือใช้ AI ตามลักษณะงาน** พร้อมฐานข้อมูลเครื่องมือ AI ที่ทีมตรวจสอบแล้ว
AI ดึงและสรุปข่าวให้ทุกเช้า ทีมตรวจก่อนขึ้นเว็บ (หรือเปิดอนุมัติอัตโนมัติ) ทั้งเว็บต้อง login ด้วย Microsoft 365 ของบริษัท

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** รันเป็น Node server
- **MySQL 8+ / 9** ผ่าน **Drizzle ORM** (`mysql2`) — เก็บเครื่องมือ คู่มือ prompt ข่าว แหล่งข่าว ผู้ใช้ และค่าตั้งค่า
- **Microsoft Entra ID (OpenID Connect)** ผ่าน `openid-client` — login ทั้งเว็บ
- **Claude / OpenAI** — คัดและสรุปข่าว และตรวจข้อมูลเครื่องมือกับหน้าทางการ (ใช้ Claude ก่อน ถ้าเรียกไม่สำเร็จใช้ OpenAI แทน)
- **Zod** — ตรวจรูปแบบข้อมูลทุกครั้งที่อ่าน/เขียนฐานข้อมูล

## โครงสร้าง

```
src/
  proxy.ts         # ด่านหน้า: ทุกหน้าต้อง login (ตรวจ session กับ DB)
  db/              # schema.ts (ตาราง), client.ts (connection pool), config.ts (ค่า DB_* จาก env)
  lib/
    auth/          # Microsoft login, session, ผู้ใช้และสิทธิ์
    news/          # ข่าว: ดึง feed, ข่าวซ้ำ, อนุมัติอัตโนมัติ, query
    catalog/       # เครื่องมือ คู่มือ แหล่งข่าว
    content/       # AI ตรวจข้อมูลเครื่องมือ → ข้อเสนอแก้ไขให้คนอนุมัติ
    categories.ts  # หมวดทั้ง 13 หมวด
  app/             # หน้าเว็บ + /admin + /login + /auth/microsoft
scripts/
  fetch-news.ts    # ดึงข่าวรายวัน (npm run news:fetch)
  check-content.ts # AI ตรวจข้อมูลเครื่องมือรายวัน (npm run content:check)
  install.ps1      # ติดตั้งบน Windows Server
  update.ps1       # อัปเดตเวอร์ชัน
  backup-db.ps1    # สำรองฐานข้อมูล
  db/              # seed ข้อมูลตั้งต้น, นำเข้าไฟล์สำรอง
drizzle/           # ไฟล์ migration
```

## รันบนเครื่องผู้พัฒนา

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่าตามคำอธิบายในไฟล์ (ฐานข้อมูล, Microsoft login, API key ของ AI)

```bash
npm install
npm run db:migrate   # สร้าง/อัปเดตตาราง
npm run db:seed      # ครั้งแรกเท่านั้น: ใส่เครื่องมือ คู่มือ และแหล่งข่าวตั้งต้น
npm run dev          # http://localhost:3000
npm run news:fetch   # ดึงข่าวด้วยมือ
npm run content:check  # ให้ AI ตรวจเครื่องมือที่มีข่าวใหม่/ข้อมูลเก่า (สร้างข้อเสนอใน /admin/suggestions)
npm run lint
npm run build
```

App registration ใน Entra ID ต้องมี Redirect URI แบบ **Web** เป็น `http://localhost:3000/auth/microsoft/callback`

## ติดตั้งขึ้น Server (ฉบับย่อ)

สำหรับ Windows Server + IIS หรือ Apache ขั้นตอนเต็ม คำสั่งทุกบรรทัด และวิธีแก้ปัญหาอยู่ใน **[DEPLOY.md](DEPLOY.md)**

**ก่อนเริ่ม ต้องมี**
- ชื่อเว็บและ certificate HTTPS ขององค์กร
- App registration ใน Microsoft Entra ID แบบ Single tenant ที่มี Redirect URI `https://<ชื่อเว็บ>/auth/microsoft/callback` (ให้ผู้ดูแล Microsoft 365 ทำ — [DEPLOY.md ขั้นที่ 3.5](DEPLOY.md#35-ลงทะเบียนแอปใน-microsoft-entra-id-ให้ผู้ดูแล-microsoft-365-ทำ))
- API key ของ Claude และ/หรือ OpenAI
- ไฟล์สำรองฐานข้อมูลจากผู้พัฒนา (ถ้าต้องการย้ายข้อมูลเดิม)
- server ออกอินเทอร์เน็ตได้ไปที่ `login.microsoftonline.com`, `api.anthropic.com`, `api.openai.com` และเว็บแหล่งข่าว

**ขั้นตอน**

1. **ลงโปรแกรม:** Node.js 24 LTS, Git, MySQL 8+ (หรือใช้ของบริษัท) และ NSSM
2. **สร้างฐานข้อมูล:** ฐานข้อมูล `promptpilot` แบบ `utf8mb4` และผู้ใช้ชื่อเดียวกัน
3. **ดาวน์โหลดโค้ดและตั้งค่า**
   ```powershell
   git clone --branch main https://github.com/Fillybodyknow/PromptPilot.git C:\Apps\PromptPilot
   Set-Location C:\Apps\PromptPilot
   Copy-Item .env.example .env.local
   notepad .env.local
   ```
   ค่าที่ต้องกรอก:
   - **ฐานข้อมูล:** `DB_NAME`, `DB_PASS`
   - **Microsoft login:** `APP_URL`, `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`
   - **ผู้ดูแลระบบคนแรก:** `ADMIN_EMAILS`
   - **AI สรุปข่าว:** `ANTHROPIC_API_KEY` และ/หรือ `OPENAI_API_KEY`
4. **รันสคริปต์ติดตั้ง** (PowerShell แบบ Administrator)
   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\Apps\PromptPilot\scripts\install.ps1 -SqlDump C:\Apps\promptpilot.sql
   ```
   สคริปต์จะทำทุกอย่างต่อจากนี้ให้ แล้วจบด้วย `Installation complete.`
   - **ติดตั้งและสร้างฐานข้อมูล:** ติดตั้ง package, นำเข้าข้อมูลหรือใส่ข้อมูลตั้งต้น, สร้างตาราง และ build
   - **รันเว็บ:** ติดตั้งเป็น Windows Service ชื่อ `PromptPilot` ที่ port 3000
   - **งานตามเวลา:** ดึงข่าวทุกวัน 06:00, AI ตรวจข้อมูลเครื่องมือทุกวัน 07:00 และสำรองฐานข้อมูลทุกคืน 02:00
5. **ตั้ง reverse proxy:** ให้ IIS (URL Rewrite + ARR) หรือ Apache ส่ง `https://<ชื่อเว็บ>/` ไปที่ `http://127.0.0.1:3000/` โดย**ต้องส่ง Host header เดิม** ไม่อย่างนั้น login จะใช้ไม่ได้ (ตัวอย่าง config อยู่ใน DEPLOY.md ขั้นที่ 6)
6. **ตรวจรับงาน**
   - เปิดเว็บแล้วถูกส่งไปหน้า login
   - login ด้วยบัญชีใน `ADMIN_EMAILS` แล้วเห็นปุ่ม Admin มุมขวาบน
   - สั่งดึงข่าว 1 รอบด้วย `Start-ScheduledTask -TaskName "PromptPilot News Fetch"`

**หลังติดตั้ง**

| งาน | คำสั่ง / ที่ไหน |
|---|---|
| อัปเดตเวอร์ชันใหม่ | `scripts\update.ps1` — สำรองข้อมูล ดึงโค้ด build แล้วเปิดเว็บใหม่ ถ้าพังจะคืนเวอร์ชันเดิมให้เอง |
| สำรองข้อมูลทันที | `scripts\backup-db.ps1` |
| ดู log | `C:\Apps\PromptPilot\logs\web.log` และ `news-YYYY-MM-DD.log` |
| ตรวจว่าเว็บและฐานข้อมูลทำงาน | `http://127.0.0.1:3000/api/health` ต้องได้ `{"ok":true}` |
| ต่ออายุ Client Secret | ก่อนวันหมดอายุ (สูงสุด 24 เดือน) — สร้างใหม่ใน Entra แก้ `MS_CLIENT_SECRET` แล้ว `Restart-Service PromptPilot` |

## ผู้ใช้และสิทธิ์

ทั้งเว็บต้อง login ด้วย Microsoft — ปกติรับเฉพาะบัญชีของบริษัท ถ้าตั้ง `MS_ALLOW_EXTERNAL=true` บัญชีภายนอก (องค์กรอื่น/บัญชีส่วนตัว) ขอเข้าใช้ได้แต่ต้องรออนุมัติ (DEPLOY.md ขั้นที่ 3.6)

| ระดับ | ได้มาอย่างไร | ทำอะไรได้ |
|---|---|---|
| ผู้อ่าน | พนักงานที่ login ครั้งแรก | อ่านข่าว คู่มือ เครื่องมือ |
| ผู้ดูแลเนื้อหา | ผู้ดูแลระบบให้ในหน้า `/admin/users` | + แก้เนื้อหาในหน้า Admin |
| ผู้ดูแลระบบ | ผู้ดูแลระบบให้ หรือ `ADMIN_EMAILS` ตอนยังไม่มีผู้ดูแลระบบสักคน | + จัดการผู้ใช้ + เปิด/ปิดอนุมัติข่าวอัตโนมัติ |

บัญชีที่ไม่ใช่พนักงาน (guest ที่บริษัทเชิญ, บัญชีองค์กรอื่น, บัญชีส่วนตัว) ต้องรอผู้ดูแลระบบอนุมัติ

## เพิ่ม/แก้ข้อมูล

แก้ทุกอย่างผ่านหน้า `/admin`: อนุมัติข่าว, เครื่องมือ, คู่มือและ prompt, แหล่งข่าว และดูประวัติการดึงข่าว

**ข้อเสนอแก้ไขจาก AI (`/admin/suggestions`):** AI เทียบข้อมูลเครื่องมือกับหน้าทางการของผู้ให้บริการ แล้วเสนอสิ่งที่ควรแก้พร้อมข้อความหลักฐาน ข้อมูลบนเว็บเปลี่ยนเมื่อผู้ดูแลกดใช้เท่านั้น ตรวจอัตโนมัติทุกเช้าสำหรับเครื่องมือที่มีข่าวใหม่ และสัปดาห์ละครั้งสำหรับเครื่องมือที่ข้อมูลเก่ากว่า 30 วัน (ถ้าหน้าทางการไม่เปลี่ยนจากครั้งก่อนจะข้ามโดยไม่เรียก AI) หรือกด "ให้ AI ตรวจตัวนี้" ในหน้าแก้ไขเครื่องมือ
ข้อมูลถูกตรวจด้วย Zod schema เดียวกับที่หน้าเว็บใช้ และหน้าเว็บอัปเดตทันทีหลังบันทึก

ไฟล์ใน `scripts/db/seed/` ใช้แค่ตอนตั้งฐานข้อมูลใหม่ครั้งแรก แก้ไฟล์เหล่านั้นจะไม่มีผลกับเว็บ
ถ้าแก้ฐานข้อมูลตรงๆ (ไม่ผ่าน admin) หน้าเว็บจะเห็นผลภายใน 10 นาทีตาม cache

## เพิ่มหมวดใหม่

1. เพิ่ม schema ของหมวดใน `src/lib/schema.ts` (extend จาก `baseEntrySchema`)
2. เพิ่ม metadata (ชื่อ, คำอธิบาย, กลุ่มงาน, คอลัมน์ตาราง) ใน `src/lib/categories.ts`
3. ใส่เครื่องมือและคู่มือของหมวดนั้นผ่านหน้า admin
