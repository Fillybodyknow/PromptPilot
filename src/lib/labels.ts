export const TOOL_STATUS_LABEL: Record<string, string> = {
  active: "ใช้งานได้",
  preview: "พรีวิว/ทดลอง",
  "not-recommended-th": "ไม่แนะนำสำหรับงานภาษาไทย",
  closing: "กำลังปิด",
  closed: "ปิดแล้ว",
  restricted: "ถูกจำกัด",
};

/** สถานะที่ควรเตือนผู้อ่าน (ใช้สีเตือนแทนสีเขียว) */
export const TOOL_STATUS_WARN = new Set(["not-recommended-th", "closing", "closed", "restricted"]);

export const ACCESS_LABEL: Record<string, string> = {
  web: "เว็บ",
  api: "API",
  cli: "CLI",
  desktop: "Desktop",
  "self-host": "Self-host",
  "ide-extension": "ส่วนขยาย IDE",
};

export const ACCESS_LABEL_LONG: Record<string, string> = {
  web: "ใช้ผ่านเว็บ ไม่ต้องติดตั้ง",
  api: "เรียกผ่าน API",
  cli: "เครื่องมือบรรทัดคำสั่ง (CLI)",
  desktop: "ติดตั้งโปรแกรมบนเครื่อง",
  "self-host": "ต้องมี IT รันเซิร์ฟเวอร์เอง",
  "ide-extension": "ส่วนขยายใน IDE",
};

export const GUIDE_NOTE_LABEL = {
  benchmarkNote: "เรื่อง Benchmark",
  thaiContextNote: "บริบทสำหรับประเทศไทย",
  adoptionNote: "การนำไปใช้ในองค์กร",
  costNote: "ต้นทุน",
  accuracyNote: "ความแม่นยำ",
} as const;

export const IMPORTANCE_LABEL: Record<number, string> = { 3: "ด่วน", 2: "ควรรู้", 1: "ทั่วไป" };

export const ROLE_LABEL = { roleEmployee: "พนักงานทั่วไป", roleIt: "ฝ่าย IT", roleExec: "ผู้บริหาร" } as const;
