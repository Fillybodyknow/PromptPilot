import type { CategoryMeta } from "@/lib/categories";
import { ACCESS_LABEL_LONG, TOOL_STATUS_LABEL } from "@/lib/labels";
import { accessMethodEnum, sourceLabelEnum, statusEnum } from "@/lib/schema";
import { FieldGroup, SelectField, TextArea, TextField } from "./fields";

/** ช่องกรอกข้อมูลเครื่องมือ — ชื่อช่องต้องตรงกับที่ parseToolForm อ่าน */
export function ToolFields({ category, values, featured }: { category: CategoryMeta; values: Record<string, string>; featured: boolean }) {
  const v = (k: string) => values[k] ?? "";
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="ข้อมูลหลัก">
        <TextField name="name" label="ชื่อ" defaultValue={v("name")} required />
        <TextField name="vendor" label="ผู้ให้บริการ" defaultValue={v("vendor")} required hint="ใช้ชื่อเดียวกับที่ระบบโลโก้รู้จัก เช่น Anthropic, Google, Microsoft" />
        <TextField name="id" label="รหัส (slug)" defaultValue={v("id")} required hint="ใช้ใน URL — a-z, 0-9 และ - เท่านั้น เปลี่ยนแล้วลิงก์เดิมจะเสีย" />
        <TextField name="modelId" label="Model ID" defaultValue={v("modelId")} hint="ไม่บังคับ" />
        <TextField name="url" label="ลิงก์ทางการ" type="url" defaultValue={v("url")} required />
        <TextField name="releaseDate" label="วันที่เปิดตัว" defaultValue={v("releaseDate")} required hint='เช่น "2026" หรือ "2026-06"' />
        <SelectField name="status" label="สถานะ" defaultValue={v("status") || "active"} options={statusEnum.options.map((s) => ({ value: s, label: TOOL_STATUS_LABEL[s] ?? s }))} />
        <SelectField name="accessMethod" label="วิธีเข้าถึง" defaultValue={v("accessMethod") || "web"} options={accessMethodEnum.options.map((a) => ({ value: a, label: ACCESS_LABEL_LONG[a] ?? a }))} />
        <label className="flex basis-full items-center gap-2.5 text-sm">
          <input type="checkbox" name="featured" defaultChecked={featured} className="h-5 w-5" />
          แสดงในส่วน &ldquo;เครื่องมือแนะนำ&rdquo; บนหน้าแรก
        </label>
      </FieldGroup>

      <FieldGroup title="สำหรับพนักงาน">
        <TextArea name="bestFor" label="เหมาะกับ" defaultValue={v("bestFor")} required rows={2} />
        <TextArea name="summary" label="สรุปจุดเด่น/จุดอ่อน" defaultValue={v("summary")} required />
      </FieldGroup>

      <FieldGroup title="สำหรับ IT">
        <TextArea name="installSteps" label="ขั้นตอนติดตั้ง/เริ่มใช้" defaultValue={v("installSteps")} hint="บรรทัดละ 1 ขั้นตอน" rows={4} />
        {category.columns.map((c) => (
          <TextArea key={c.key} name={c.key} label={c.labelTh} defaultValue={v(c.key)} required rows={2} />
        ))}
        <TextArea name="warning" label="ข้อควรระวัง" defaultValue={v("warning")} hint="ไม่บังคับ — แสดงเป็นกล่องเตือนบนหน้าเครื่องมือ" rows={2} />
      </FieldGroup>

      <FieldGroup title="สำหรับผู้บริหาร">
        <TextArea name="priceNote" label="รายละเอียดราคา" defaultValue={v("priceNote")} required />
        <TextField name="priceUsdIn" label="ราคา input (USD ต่อ 1M token)" type="number" defaultValue={v("priceUsdIn")} hint="เฉพาะเครื่องมือที่คิดราคาแบบ token" />
        <TextField name="priceUsdOut" label="ราคา output (USD ต่อ 1M token)" type="number" defaultValue={v("priceUsdOut")} />
        <TextArea name="benchmark" label="ผลทดสอบ" defaultValue={v("benchmark")} hint="ไม่บังคับ" rows={2} />
      </FieldGroup>

      <FieldGroup title="แหล่งข้อมูล">
        <SelectField name="sourceLabel" label="ประเภทแหล่งข้อมูล" defaultValue={v("sourceLabel") || "official"} options={sourceLabelEnum.options.map((s) => ({ value: s, label: s === "official" ? "Official" : "ชุมชน" }))} />
        <TextField name="verifiedAt" label="วันที่ตรวจล่าสุด" type="date" defaultValue={v("verifiedAt")} required />
        <TextField name="sourceUrl" label="ลิงก์แหล่งอ้างอิง" type="url" defaultValue={v("sourceUrl")} hint="ไม่บังคับ" />
        <TextField name="tags" label="แท็ก" defaultValue={v("tags")} hint="คั่นด้วยจุลภาค ไม่บังคับ" />
      </FieldGroup>
    </div>
  );
}
