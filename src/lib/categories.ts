import { z } from "zod";
import * as schemas from "./schema";

export interface ColumnDef {
  /** ชื่อ field ใน entry (นอกเหนือจาก base fields) */
  key: string;
  /** หัวคอลัมน์ภาษาไทยที่จะแสดงในตาราง */
  labelTh: string;
}

export interface CategoryMeta {
  key: string;
  titleTh: string;
  descriptionTh: string;
  /** ใช้จัดกลุ่มหมวดที่เกี่ยวข้องกันในหน้าแรก/nav (เช่น coding-models + coding-tools) */
  group: string;
  schema: z.ZodTypeAny;
  columns: ColumnDef[];
}

/**
 * 11 หมวดที่จำเป็นในองค์กร (จาก 16 หมวดของเว็บสาธารณะเดิม ตัดหมวดเชิงศิลป์/บันเทิง
 * ที่ไม่จำเป็นต่องานองค์กรทั่วไปออก — วิดีโอเชิงศิลป์, เพลง, 3D/เกม, browser agent
 * ทดลอง — และเพิ่มหมวดที่องค์กรต้องใช้แต่เว็บสาธารณะไม่มี: งานนำเสนอ, งานประชุม/ถอดเสียง)
 */
export const CATEGORIES: CategoryMeta[] = [
  {
    key: "general-assistant",
    titleTh: "ผู้ช่วยสนทนา/ถามตอบทั่วไป",
    descriptionTh: "ถาม-ตอบ, brainstorm, ช่วยตัดสินใจเบื้องต้น — งานพื้นฐานที่ใช้บ่อยสุดในทุกแผนก",
    group: "ผู้ช่วยทั่วไป",
    schema: schemas.generalAssistantSchema,
    columns: [],
  },
  {
    key: "business-writing",
    titleTh: "งานเอกสาร/เขียนธุรกิจ",
    descriptionTh: "อีเมล, รายงาน, proposal, สรุปการประชุมเป็นลายลักษณ์อักษร",
    group: "งานเอกสาร",
    schema: schemas.businessWritingSchema,
    columns: [],
  },
  {
    key: "presentations",
    titleTh: "งานนำเสนอ/สไลด์",
    descriptionTh: "เจนสไลด์ประชุมภายในและนำเสนอลูกค้า",
    group: "งานเอกสาร",
    schema: schemas.designUiSchema,
    columns: [{ key: "outputType", labelTh: "รูปแบบผลลัพธ์" }],
  },
  {
    key: "coding-models",
    titleTh: "เขียนโปรแกรม — โมเดล",
    descriptionTh: "โมเดลที่ใช้เป็น backend งานวิศวกรรมซอฟต์แวร์",
    group: "งานพัฒนาระบบ",
    schema: schemas.codingModelsSchema,
    columns: [],
  },
  {
    key: "coding-tools",
    titleTh: "เขียนโปรแกรม — เครื่องมือ/IDE/Agent",
    descriptionTh: "IDE, CLI agent, ปลั๊กอิน สำหรับทีม dev/IT",
    group: "งานพัฒนาระบบ",
    schema: schemas.codingToolsSchema,
    columns: [],
  },
  {
    key: "data-analysis",
    titleTh: "งานวิเคราะห์ข้อมูล/รายงาน (BI)",
    descriptionTh: "EDA, กราฟ, สรุปเชิงสถิติ, spreadsheet",
    group: "งานข้อมูล",
    schema: schemas.dataAnalysisSchema,
    columns: [],
  },
  {
    key: "research-docs",
    titleTh: "งานวิจัย/สรุปเอกสารยาว",
    descriptionTh: "อ่านสัญญา/นโยบาย, สรุปเอกสารยาว, ค้นข้อมูลภายในองค์กร",
    group: "งานข้อมูล",
    schema: schemas.researchDocsSchema,
    columns: [{ key: "researchType", labelTh: "ลักษณะการค้นคว้า" }],
  },
  {
    key: "image-gen",
    titleTh: "งานออกแบบ/สื่อการตลาด — ภาพ",
    descriptionTh: "Text-to-image และ image editing สำหรับสื่อองค์กร",
    group: "งานออกแบบ",
    schema: schemas.imageGenSchema,
    columns: [],
  },
  {
    key: "design-ui",
    titleTh: "งานออกแบบ/สื่อการตลาด — UI/กราฟิก",
    descriptionTh: "Text-to-UI, component generation, งานออกแบบทั่วไป",
    group: "งานออกแบบ",
    schema: schemas.designUiSchema,
    columns: [{ key: "outputType", labelTh: "รูปแบบผลลัพธ์" }],
  },
  {
    key: "meetings-transcription",
    titleTh: "งานประชุม/ถอดเสียง",
    descriptionTh: "ถอดเสียงประชุม, สรุป meeting notes อัตโนมัติ",
    group: "งานสื่อสาร",
    schema: schemas.meetingsSchema,
    columns: [{ key: "thaiSupport", labelTh: "รองรับภาษาไทย" }],
  },
  {
    key: "translation",
    titleTh: "งานแปลภาษา",
    descriptionTh: "สื่อสารข้ามภาษา, เอกสารสองภาษา, ไทย↔อังกฤษเฉพาะทาง",
    group: "งานสื่อสาร",
    schema: schemas.translationSchema,
    columns: [{ key: "thaiSupport", labelTh: "รองรับภาษาไทย" }],
  },
  {
    key: "automation",
    titleTh: "Automation/เชื่อมระบบภายใน",
    descriptionTh: "เชื่อม AI เข้ากับระบบองค์กร (ERP, CRM, ฐานข้อมูล) ผ่าน workflow/MCP",
    group: "งานระบบ",
    schema: schemas.automationSchema,
    columns: [],
  },
  {
    key: "self-hosted",
    titleTh: "โมเดล Self-hosted/On-prem",
    descriptionTh: "สำหรับข้อมูลอ่อนไหว (การเงิน/กฎหมาย/ลูกค้า) ที่ห้ามส่งออกนอกองค์กร",
    group: "งานระบบ",
    schema: schemas.openWeightSelfhostedSchema,
    columns: [{ key: "hardwareNote", labelTh: "ข้อกำหนดฮาร์ดแวร์" }],
  },
];

export function getCategory(key: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

/** จัดหมวดเป็นกลุ่มตาม `group` เพื่อแสดงบนหน้าแรก */
export function getCategoriesGrouped(): { group: string; categories: CategoryMeta[] }[] {
  const groups: { group: string; categories: CategoryMeta[] }[] = [];
  for (const category of CATEGORIES) {
    let bucket = groups.find((g) => g.group === category.group);
    if (!bucket) {
      bucket = { group: category.group, categories: [] };
      groups.push(bucket);
    }
    bucket.categories.push(category);
  }
  return groups;
}
