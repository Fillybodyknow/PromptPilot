import { TextArea, TextField } from "./fields";

/** ช่องกรอก prompt — ชื่อช่องต้องตรงกับที่ parsePromptForm อ่าน */
export function PromptFields({ values }: { values: Record<string, string> }) {
  const v = (k: string) => values[k] ?? "";
  return (
    <div className="flex flex-wrap gap-4">
      <TextField name="task" label="งานที่ prompt นี้ใช้ทำ" defaultValue={v("task")} required wide />
      <TextArea name="badPrompt" label="prompt แบบที่ได้ผลไม่ดี" defaultValue={v("badPrompt")} hint="ไม่บังคับ — ใส่เพื่อสอนแบบก่อน/หลัง" rows={2} />
      <TextArea name="goodPrompt" label="prompt แบบที่แนะนำ" defaultValue={v("goodPrompt")} required rows={8} />
      <TextArea name="why" label="ทำไมได้ผล" defaultValue={v("why")} required />
      <TextField name="sourceUrl" label="ลิงก์แหล่งอ้างอิงของหลักการ" type="url" defaultValue={v("sourceUrl")} hint="ไม่บังคับ" wide />
      <label className="flex basis-full items-center gap-2.5 text-sm">
        <input type="checkbox" name="tested" defaultChecked={v("tested") === "on"} className="h-5 w-5" />
        ทดสอบกับงานจริงแล้ว (ต้องใส่วันที่ทดสอบ ทดสอบกับ และตัวอย่างผลลัพธ์)
      </label>
      <TextField name="testedAt" label="วันที่ทดสอบ" type="date" defaultValue={v("testedAt")} />
      <TextField name="testedWith" label="ทดสอบกับ" defaultValue={v("testedWith")} hint="ชื่อโมเดล/เครื่องมือ คั่นด้วยจุลภาค" />
      <TextArea name="sampleOutput" label="ตัวอย่างผลลัพธ์จริง" defaultValue={v("sampleOutput")} hint="ใช้ข้อมูลสมมติ ห้ามใช้ข้อมูลจริงขององค์กร" rows={4} />
      <TextArea name="draftNote" label="หมายเหตุร่าง" defaultValue={v("draftNote")} hint="ถ้ายังไม่ได้ทดสอบ ต้องอธิบายว่าควรทดสอบอะไรก่อนแนะนำใช้จริง" rows={2} />
    </div>
  );
}
