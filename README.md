# PromptPilot

เว็บ "แนะนำการใช้ AI" — ฐานข้อมูลเปรียบเทียบเครื่องมือ AI รายหมวด สำหรับผู้ใช้ในประเทศไทย

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**
- **Zod** — validate ข้อมูลทุกหมวดตอน build เพื่อกันข้อมูลผิดรูปแบบหลุดขึ้นเว็บ
- **ข้อมูล = ไฟล์ JSON** ใน `src/data/` (ไม่มี database) — อัปเดตด้วยการแก้ไฟล์ + commit

## โครงสร้าง

```
src/
  lib/
    schema.ts      # Zod schema: base fields ร่วม + extension ต่อหมวด (16 หมวด)
    categories.ts  # metadata: ชื่อหมวดภาษาไทย, คำอธิบาย, คอลัมน์ตารางที่จะแสดง
    data.ts        # โหลด + validate JSON แต่ละหมวดด้วย schema ที่ตรงกัน
  data/
    *.json         # ข้อมูลจริงต่อหมวด (แก้ตรงนี้เพื่ออัปเดตเว็บ)
  components/
    ComparisonTable.tsx  # ตารางเปรียบเทียบ generic ใช้ร่วมกันทุกหมวด
  app/
    page.tsx            # หน้าแรก: การ์ดลิงก์ไปแต่ละหมวด
    [category]/page.tsx # หน้าตารางเปรียบเทียบต่อหมวด (static generate ล่วงหน้า)
```

## รันโปรเจกต์

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build + validate JSON ทุกหมวดด้วย Zod (fail ถ้าข้อมูลผิด schema)
npm run lint
```

## เพิ่ม/แก้ข้อมูล

แก้ไฟล์ JSON ที่ตรงหมวดใน `src/data/` ได้เลย ทุก entry ต้องมี field พื้นฐาน (`id`,
`name`, `vendor`, `sourceLabel`, `verifiedAt`, `status`, `summary`) บวก field
เฉพาะหมวดตามที่กำหนดใน `src/lib/schema.ts` — รัน `npm run build` เพื่อตรวจว่า
JSON ยังตรง schema ก่อน commit

## เพิ่มหมวดใหม่

1. เพิ่ม schema ในหมวดใน `src/lib/schema.ts` (extend จาก `baseEntrySchema`)
2. เพิ่ม metadata (ชื่อ, คำอธิบาย, คอลัมน์ตาราง) ใน `src/lib/categories.ts`
3. สร้างไฟล์ `src/data/<key>.json`
4. import + เพิ่มใน `RAW_DATA` ที่ `src/lib/data.ts`

## แผนถัดไป (ยังไม่ทำในสแคฟโฟลด์นี้)

- Auto-update pipeline: GitHub Action ดึงข้อมูลจาก Artificial Analysis / LMArena /
  Vals AI แล้วเปิด PR ให้รีวิวก่อน merge
- Git-based CMS (เช่น Decap CMS) ให้ทีมที่ไม่ใช่ dev แก้ JSON ผ่านหน้าเว็บได้
- Filter/sort ฝั่ง client ด้วย TanStack Table + Fuse.js
