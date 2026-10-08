# PromptPilot

เว็บ "แนะนำการใช้ AI" — ฐานข้อมูลเปรียบเทียบเครื่องมือ AI รายหมวด สำหรับผู้ใช้ในประเทศไทย

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** รันเป็น Node server
- **MySQL 8+ / 9** ผ่าน **Drizzle ORM** (`mysql2`) — เก็บเครื่องมือ คู่มือ prompt ข่าว และแหล่งข่าว
- **Zod** — ตรวจรูปแบบข้อมูลเครื่องมือ/คู่มือทุกครั้งที่อ่านจาก DB กันข้อมูลผิดรูปแบบหลุดขึ้นเว็บ

## โครงสร้าง

```
src/
  db/
    schema.ts      # ตาราง MySQL (Drizzle) — แก้ที่นี่แล้วรัน npm run db:generate
    client.ts      # connection pool
    config.ts      # อ่านค่า DB_* จาก env
  lib/
    schema.ts      # Zod schema: base fields ร่วม + extension ต่อหมวด
    categories.ts  # หมวดทั้ง 13 หมวด: ชื่อภาษาไทย คำอธิบาย กลุ่มงาน คอลัมน์เฉพาะหมวด
    data.ts        # อ่านเครื่องมือ/คู่มือจาก DB (มี cache) + validate ด้วย Zod
    catalog/repo.ts, news/repo.ts  # query ฐานข้อมูล
  app/              # หน้าเว็บ + /admin/news (หน้าอนุมัติข่าว)
scripts/
  fetch-news.ts     # ดึงข่าวรายวัน + ให้ AI คัด/สรุป (npm run news:fetch)
  db/seed.ts        # ใส่ข้อมูลตั้งต้นจาก scripts/db/seed/ ลง DB ใหม่
drizzle/            # ไฟล์ migration
```

## รันโปรเจกต์

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอก: `DB_NAME`, `DB_PASS` (+ `DB_HOST`, `DB_PORT` ถ้าไม่ใช่ `localhost:3306` และ `DB_USER` ถ้าชื่อผู้ใช้ MySQL ไม่ตรงกับ `DB_NAME`),
`ANTHROPIC_API_KEY` และ/หรือ `OPENAI_API_KEY` (ใช้ Claude ก่อน ถ้าเรียกไม่สำเร็จจะใช้ OpenAI แทน)

```bash
npm install
npm run db:migrate   # สร้าง/อัปเดตตาราง — รันทุกครั้งที่ deploy เวอร์ชันใหม่
npm run db:seed      # ครั้งแรกเท่านั้น: ใส่เครื่องมือ คู่มือ และแหล่งข่าวตั้งต้น
npm run dev          # http://localhost:3000
npm run build
npm run lint
```

ติดตั้งขึ้น Windows Server (IIS/Apache) ดูขั้นตอนเต็มที่ [DEPLOY.md](DEPLOY.md) — ใช้ `scripts/install.ps1` ติดตั้ง, `scripts/update.ps1` อัปเดต, `scripts/backup-db.ps1` สำรองฐานข้อมูล

## เพิ่ม/แก้ข้อมูล

แก้ทุกอย่างผ่านหน้า `/admin` (login ที่ `/login` ด้วยบัญชีในตาราง `users` — สร้างคนแรกด้วย `npm run user:create -- <username>` แล้วเพิ่มคนอื่นในหน้า `/admin/users`): อนุมัติข่าว, เครื่องมือ,
คู่มือและ prompt, แหล่งข่าว และดูประวัติการดึงข่าว ข้อมูลถูกตรวจด้วย Zod schema เดียวกับที่หน้าเว็บใช้
และหน้าเว็บอัปเดตทันทีหลังบันทึก

ไฟล์ใน `scripts/db/seed/` ใช้แค่ตอนตั้ง DB ใหม่ครั้งแรก แก้ไฟล์เหล่านั้นจะไม่มีผลกับเว็บ
ถ้าแก้ DB ตรงๆ (ไม่ผ่าน admin) หน้าเว็บจะเห็นผลภายใน 10 นาทีตาม cache

## เพิ่มหมวดใหม่

1. เพิ่ม schema ในหมวดใน `src/lib/schema.ts` (extend จาก `baseEntrySchema`)
2. เพิ่ม metadata (ชื่อ, คำอธิบาย, คอลัมน์ตาราง) ใน `src/lib/categories.ts`
3. ใส่เครื่องมือและคู่มือของหมวดนั้นลงตาราง `tools` / `guides` / `prompt_templates`

## แผนถัดไป (ยังไม่ทำในสแคฟโฟลด์นี้)

- Auto-update pipeline: GitHub Action ดึงข้อมูลจาก Artificial Analysis / LMArena /
  Vals AI แล้วเปิด PR ให้รีวิวก่อน merge
- Git-based CMS (เช่น Decap CMS) ให้ทีมที่ไม่ใช่ dev แก้ JSON ผ่านหน้าเว็บได้
- Filter/sort ฝั่ง client ด้วย TanStack Table + Fuse.js
"# PromptPilot" 
