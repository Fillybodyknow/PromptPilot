import { z } from "zod";

/**
 * Shared vocabulary used across every category.
 */
export const sourceLabelEnum = z.enum(["official", "community"]);

/**
 * "closing" / "closed" / "restricted" have no entries in the data right now,
 * but stay in the enum — nothing renamed or dropped that concept, the
 * current tools just don't happen to be in that state. "preview" and
 * "not-recommended-th" are new.
 */
export const statusEnum = z.enum([
  "active",
  "preview",
  "not-recommended-th",
  "closing",
  "closed",
  "restricted",
]);

/**
 * วิธีเข้าถึง/ติดตั้งเครื่องมือ — ใช้ทั้งระดับ category guide และระดับเครื่องมือแต่ละตัว.
 * Renamed/reshaped from the previous vocabulary (desktop-installer -> desktop,
 * self-hosted -> self-host) and dropped browser-extension/sso-license, which
 * no current entry uses; added api and ide-extension.
 */
export const accessMethodEnum = z.enum(["web", "api", "cli", "desktop", "self-host", "ide-extension"]);

/**
 * Fields every entry in every category now shares — the per-category data was
 * restructured onto one common shape (benchmark/price/bestFor/warning etc. used
 * to be category-specific "columns"; they're universal now). Only a handful of
 * categories still have a genuinely unique field on top of this (see the
 * per-category `.extend()`s below).
 */
export const baseEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().min(1),
  /** ID จำเพาะของโมเดล/API — null ถ้าไม่มี (เช่น เครื่องมือที่ไม่ใช่ LLM โดยตรง) */
  modelId: z.string().min(1).nullable(),
  /** วันที่เปิดตัว — free-form ("2026", "2026-06", "2026-07-24") ไม่ใช่ YYYY-MM-DD เสมอไป */
  releaseDate: z.string().min(1),
  sourceLabel: sourceLabelEnum,
  /** ต้องเป็นรูปแบบ YYYY-MM-DD — วันที่ verify ข้อมูลแถวนี้ล่าสุด */
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "verifiedAt ต้องเป็นรูปแบบ YYYY-MM-DD"),
  status: statusEnum,
  /** ลิงก์ไปหน้าทางการของเครื่องมือ/โมเดลนี้ — ทำให้ชื่อในการ์ดคลิกได้ */
  url: z.url(),
  /** ลิงก์อ้างอิงแหล่งข้อมูลที่ใช้กรอกแถวนี้ (รีวิว/ข่าว/เอกสารเปรียบเทียบ) — null ถ้าไม่มี */
  sourceUrl: z.url().nullable(),
  /** คะแนน/ผลทดสอบเชิงเทคนิค (ข้อความอิสระ อาจอ้างหลาย benchmark) — null ถ้าไม่มีข้อมูล */
  benchmark: z.string().min(1).nullable(),
  /** ราคาต่อ 1M token แบบ API — null ถ้าไม่ใช่ pricing แบบ token (ดู priceNote แทน) */
  priceUsdIn: z.number().nullable(),
  priceUsdOut: z.number().nullable(),
  /** คำอธิบายราคาแบบเต็ม (แผน/เงื่อนไข/ต้นทุนแฝง) — มีเสมอแม้ priceUsdIn/Out จะเป็น null */
  priceNote: z.string().min(1),
  /** โจทย์/สถานการณ์ที่เครื่องมือนี้เหมาะที่สุด */
  bestFor: z.string().min(1),
  /** จุดเด่น/จุดอ่อนโดยรวม */
  summary: z.string().min(1),
  /** ข้อควรระวังเฉพาะตัว (ราคาแฝง, ข้อจำกัดที่มักถูกมองข้าม ฯลฯ) — ไม่มีทุกตัว */
  warning: z.string().min(1).nullable().optional(),
  accessMethod: accessMethodEnum,
  installSteps: z.array(z.string().min(1)),
  tags: z.array(z.string()).optional(),
});

export type BaseEntry = z.infer<typeof baseEntrySchema>;

// ---------------------------------------------------------------------------
// ผู้ช่วยสนทนา/ถามตอบทั่วไป (general-assistant)
// ---------------------------------------------------------------------------
export const generalAssistantSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// งานเอกสาร/เขียนธุรกิจ (business-writing)
// ---------------------------------------------------------------------------
export const businessWritingSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// เขียนโปรแกรม — โมเดล (coding-models)
// ---------------------------------------------------------------------------
export const codingModelsSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// เขียนโปรแกรม — เครื่องมือ/IDE/agent (coding-tools)
// ---------------------------------------------------------------------------
export const codingToolsSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// งานออกแบบ/สื่อการตลาด — ภาพ (image-gen)
// ---------------------------------------------------------------------------
export const imageGenSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// งานออกแบบ/สื่อการตลาด — UI/กราฟิก/สไลด์ (design-ui, presentations)
// ---------------------------------------------------------------------------
export const designUiSchema = baseEntrySchema.extend({
  /** รูปแบบผลลัพธ์ที่ได้ เช่น "mockup ใน Figma", "ไฟล์ .pptx" */
  outputType: z.string().min(1),
});

// ---------------------------------------------------------------------------
// งานวิเคราะห์ข้อมูล/รายงาน (data-analysis)
// ---------------------------------------------------------------------------
export const dataAnalysisSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// งานวิจัย/สรุปเอกสารยาว (research-docs)
// ---------------------------------------------------------------------------
export const researchDocsSchema = baseEntrySchema.extend({
  /** ลักษณะการค้นคว้า เช่น "RAG แบบปิด — ตอบจากเอกสารที่คุณอัปโหลดเท่านั้น" */
  researchType: z.string().min(1),
});

// ---------------------------------------------------------------------------
// งานประชุม/ถอดเสียง (meetings-transcription)
// ---------------------------------------------------------------------------
export const meetingsSchema = baseEntrySchema.extend({
  /** สถานะรองรับภาษาไทยแบบข้อความอิสระ — มักมีคำเตือนเรื่องยังไม่ verify ตัวเลขจริง */
  thaiSupport: z.string().min(1),
});

// ---------------------------------------------------------------------------
// งานแปลภาษา (translation)
// ---------------------------------------------------------------------------
export const translationSchema = baseEntrySchema.extend({
  thaiSupport: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Automation / เชื่อมระบบภายใน (automation)
// ---------------------------------------------------------------------------
export const automationSchema = baseEntrySchema;

// ---------------------------------------------------------------------------
// โมเดล Self-hosted/On-prem (self-hosted)
// ---------------------------------------------------------------------------
export const openWeightSelfhostedSchema = baseEntrySchema.extend({
  /** ข้อกำหนดฮาร์ดแวร์ (VRAM/RAM) แบบข้อความอิสระ */
  hardwareNote: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Category Guide — เนื้อหา "วิธีใช้งาน / เขียน prompt / ติดตั้ง" ต่อ 1 หมวด
// (แยกจาก tool catalog ด้านบน — 1 หมวดมี guide เดียว ไม่ใช่ 1 ต่อเครื่องมือ;
// accessMethodEnum ถูกย้ายไปประกาศรวมกับ baseEntrySchema ด้านบนแล้ว เพราะใช้ร่วมกันทั้งสองที่)
// ---------------------------------------------------------------------------
export const promptTemplateSchema = z
  .object({
    /** โจทย์/งานที่ prompt นี้ใช้ทำ */
    task: z.string().min(1),
    /** ตัวอย่าง prompt ที่ไม่ดี (optional — ใส่เพื่อสอนผ่าน before/after) */
    badPrompt: z.string().optional(),
    /** ตัวอย่าง prompt ที่ดี พร้อมใช้ (copy ไปวางได้เลย) */
    goodPrompt: z.string().min(1),
    /** อธิบายว่าทำไม prompt นี้ถึงได้ผล (หลักการ — ไม่ได้แปลว่าทดสอบผลจริงแล้ว) */
    why: z.string().min(1),
    /**
     * true = มีคนลองรันจริงกับโมเดลที่ระบุใน testedWith แล้วได้ผลตามคาด
     * false = เป็นตัวอย่างที่เขียนจากหลักการทั่วไป ยังไม่ได้ทดสอบผลจริง — ต้องระวังก่อนแนะนำใช้งานจริง
     */
    tested: z.boolean(),
    /** ต้องใส่คู่กับ tested: true — วันที่ทดสอบล่าสุด รูปแบบ YYYY-MM-DD; null เมื่อ tested: false */
    testedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "testedAt ต้องเป็นรูปแบบ YYYY-MM-DD")
      .nullable(),
    /** ต้องมีอย่างน้อย 1 รายการคู่กับ tested: true — ชื่อโมเดล/เครื่องมือที่ใช้ทดสอบ; [] เมื่อ tested: false */
    testedWith: z.array(z.string().min(1)),
    /**
     * หลักฐานที่ 1: ตัวอย่าง output จริงจากการรัน goodPrompt (ใช้ input สมมติ ไม่ใช่ข้อมูลจริงขององค์กร)
     * ต้องใส่คู่กับ tested: true — คือหลักฐานว่า prompt นี้ให้ผลลัพธ์แบบที่ "why" อธิบายไว้จริง; null เมื่อ tested: false
     */
    sampleOutput: z.string().min(1).nullable(),
    /**
     * เมื่อ tested: false — อธิบายว่า prompt นี้ยังเป็นแค่ร่าง ควรทดสอบยังไงก่อนแนะนำใช้งานจริง
     * (คู่กันกับ testedAt/testedWith/sampleOutput ที่ใช้ตอน tested: true)
     */
    draftNote: z.string().min(1).nullable(),
    /**
     * หลักฐานที่ 2: ลิงก์อ้างอิงแหล่งที่มาของหลักการที่ใช้ใน "why" (เช่น prompt engineering guide
     * ของผู้พัฒนาโมเดล) — ใส่ได้ไม่ว่า tested จะเป็น true/false เพราะเป็นหลักฐานเชิงหลักการ
     * ไม่ใช่หลักฐานว่า prompt นี้เจาะจงถูกทดสอบแล้ว
     */
    sourceUrl: z.url().optional(),
  })
  .refine(
    (data) => !data.tested || (!!data.testedAt && data.testedWith.length > 0 && !!data.sampleOutput),
    {
      message:
        "ถ้า tested เป็น true ต้องระบุ testedAt, testedWith อย่างน้อย 1 รายการ, และ sampleOutput เป็นหลักฐาน",
      path: ["tested"],
    }
  )
  .refine((data) => data.tested || !!data.draftNote, {
    message: "ถ้า tested เป็น false ควรระบุ draftNote อธิบายว่ายังต้องทดสอบอะไรก่อนแนะนำใช้งานจริง",
    path: ["draftNote"],
  });

export const accessLinkSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
});

export const categoryGuideSchema = z.object({
  categoryKey: z.string().min(1),
  howToUse: z.string().min(1),
  accessMethod: accessMethodEnum,
  /** ลิงก์ทางการที่พาไปเริ่มใช้งานได้เลย (เช่น claude.ai, chatgpt.com) */
  links: z.array(accessLinkSchema).optional(),
  installSteps: z.array(z.string()).optional(),
  dataHandlingNote: z.string().min(1),
  /** หมายเหตุเสริมเฉพาะบางหมวด — ไม่ใช่ทุกหมวดจะมีทุกฟิลด์นี้ */
  benchmarkNote: z.string().min(1).optional(),
  thaiContextNote: z.string().min(1).optional(),
  adoptionNote: z.string().min(1).optional(),
  costNote: z.string().min(1).optional(),
  accuracyNote: z.string().min(1).optional(),
  promptTemplates: z.array(promptTemplateSchema).min(1),
});

export type CategoryGuide = z.infer<typeof categoryGuideSchema>;
export type PromptTemplate = z.infer<typeof promptTemplateSchema>;
