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
    client.ts      # connection pool (อ่าน DATABASE_URL)
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

ตั้งค่าใน `.env.local`: `DATABASE_URL=mysql://user:pass@localhost:3306/promptpilot`,
`ADMIN_USER`, `ADMIN_PASSWORD` และ `OPENAI_API_KEY` หรือ `ANTHROPIC_API_KEY` (+ `NEWS_PROVIDER`)

```bash
npm install
npm run db:migrate   # สร้าง/อัปเดตตาราง — รันทุกครั้งที่ deploy เวอร์ชันใหม่
npm run db:seed      # ครั้งแรกเท่านั้น: ใส่เครื่องมือ คู่มือ และแหล่งข่าวตั้งต้น
npm run dev          # http://localhost:3000
npm run build
npm run lint
```

## เพิ่ม/แก้ข้อมูล

ข้อมูลเครื่องมือและคู่มืออยู่ใน MySQL (ตาราง `tools`, `guides`, `prompt_templates`)
ไฟล์ใน `scripts/db/seed/` ใช้แค่ตอนตั้ง DB ใหม่ครั้งแรก แก้ไฟล์เหล่านั้นจะไม่มีผลกับเว็บ
หน้าเว็บ cache ข้อมูลไว้สูงสุด 10 นาที ถ้าแก้ DB ตรงๆ จะเห็นผลหลังจากนั้น

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
