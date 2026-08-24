import { z } from "zod";

/**
 * Shared vocabulary used across every category.
 */
export const sourceLabelEnum = z.enum(["official", "community"]);
export const statusEnum = z.enum(["active", "closing", "closed", "restricted"]);

/**
 * Fields every entry in every category must have, regardless of category-specific
 * columns (price, benchmark, license, ...). Mirrors the recurring columns in the
 * source dataset: ชื่อ / ผู้พัฒนา / [Official]-[Community] / verify date / สถานะ / จุดเด่น-จุดอ่อน.
 */
export const baseEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().min(1),
  sourceLabel: sourceLabelEnum,
  /** ต้องเป็นรูปแบบ YYYY-MM-DD — วันที่ verify ข้อมูลแถวนี้ล่าสุด */
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "verifiedAt ต้องเป็นรูปแบบ YYYY-MM-DD"),
  status: statusEnum,
  /** จุดเด่น/จุดอ่อน หรือคำอธิบายสั้น */
  summary: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export type BaseEntry = z.infer<typeof baseEntrySchema>;

// ---------------------------------------------------------------------------
// ผู้ช่วยสนทนา/ถามตอบทั่วไป (general-assistant)
// ---------------------------------------------------------------------------
export const generalAssistantSchema = baseEntrySchema.extend({
  modelId: z.string().optional(),
  releaseDate: z.string().optional(),
  benchmark: z.string(),
  priceUsdIn: z.number().nullable(),
  priceUsdOut: z.number().nullable(),
  bestFor: z.string(),
});

// ---------------------------------------------------------------------------
// งานเอกสาร/เขียนธุรกิจ (business-writing)
// ---------------------------------------------------------------------------
export const businessWritingSchema = baseEntrySchema.extend({
  strength: z.string(),
});

// ---------------------------------------------------------------------------
// เขียนโปรแกรม — โมเดล (coding-models)
// ---------------------------------------------------------------------------
export const codingModelsSchema = baseEntrySchema.extend({
  sweBenchVerified: z.string(),
  note: z.string(),
});

// ---------------------------------------------------------------------------
// เขียนโปรแกรม — เครื่องมือ/IDE/agent (coding-tools)
// ---------------------------------------------------------------------------
export const codingToolsSchema = baseEntrySchema.extend({
  toolType: z.enum(["ide", "cli-agent", "plugin", "cloud-agent"]),
  price: z.string(),
  bestFor: z.string(),
});

// ---------------------------------------------------------------------------
// งานออกแบบ/สื่อการตลาด — ภาพ (image-gen)
// ---------------------------------------------------------------------------
export const imageGenSchema = baseEntrySchema.extend({
  pricePerThousand: z.string().optional(),
  strength: z.string(),
  licenseNote: z.string(),
});

// ---------------------------------------------------------------------------
// งานออกแบบ/สื่อการตลาด — UI/กราฟิก/สไลด์ (design-ui, presentations)
// ---------------------------------------------------------------------------
export const designUiSchema = baseEntrySchema.extend({
  strength: z.string(),
  pricing: z.string(),
  integration: z.string().optional(),
});

// ---------------------------------------------------------------------------
// งานวิเคราะห์ข้อมูล/รายงาน (data-analysis)
// ---------------------------------------------------------------------------
export const dataAnalysisSchema = baseEntrySchema.extend({
  strength: z.string(),
});

// ---------------------------------------------------------------------------
// งานวิจัย/สรุปเอกสารยาว (research-docs)
// ---------------------------------------------------------------------------
export const researchDocsSchema = baseEntrySchema.extend({
  strength: z.string(),
  pricing: z.string(),
});

// ---------------------------------------------------------------------------
// งานประชุม/ถอดเสียง (meetings-transcription)
// ---------------------------------------------------------------------------
export const meetingsSchema = baseEntrySchema.extend({
  capability: z.enum(["transcription", "meeting-summary", "live-notes"]),
  integration: z.string(),
  pricing: z.string(),
});

// ---------------------------------------------------------------------------
// งานแปลภาษา (translation)
// ---------------------------------------------------------------------------
export const translationSchema = baseEntrySchema.extend({
  strength: z.string(),
  scope: z.enum(["international", "thai"]),
});

// ---------------------------------------------------------------------------
// Automation / เชื่อมระบบภายใน (automation)
// ---------------------------------------------------------------------------
export const automationSchema = baseEntrySchema.extend({
  strength: z.string(),
  pricingModel: z.string(),
  selfHost: z.boolean(),
});

// ---------------------------------------------------------------------------
// โมเดล Self-hosted/On-prem (self-hosted)
// ---------------------------------------------------------------------------
export const openWeightSelfhostedSchema = baseEntrySchema.extend({
  vramTier: z.string(),
  recommendedRunner: z.string(),
  licenseNote: z.string(),
});

// ---------------------------------------------------------------------------
// Category Guide — เนื้อหา "วิธีใช้งาน / เขียน prompt / ติดตั้ง" ต่อ 1 หมวด
// (แยกจาก tool catalog ด้านบน — 1 หมวดมี guide เดียว ไม่ใช่ 1 ต่อเครื่องมือ)
// ---------------------------------------------------------------------------
export const accessMethodEnum = z.enum([
  "web",
  "browser-extension",
  "desktop-installer",
  "cli",
  "self-hosted",
  "sso-license",
]);

export const promptTemplateSchema = z.object({
  /** โจทย์/งานที่ prompt นี้ใช้ทำ */
  task: z.string().min(1),
  /** ตัวอย่าง prompt ที่ไม่ดี (optional — ใส่เพื่อสอนผ่าน before/after) */
  badPrompt: z.string().optional(),
  /** ตัวอย่าง prompt ที่ดี พร้อมใช้ (copy ไปวางได้เลย) */
  goodPrompt: z.string().min(1),
  /** อธิบายว่าทำไม prompt นี้ถึงได้ผล */
  why: z.string().min(1),
});

export const categoryGuideSchema = z.object({
  categoryKey: z.string().min(1),
  howToUse: z.string().min(1),
  accessMethod: accessMethodEnum,
  installSteps: z.array(z.string()).optional(),
  dataHandlingNote: z.string().min(1),
  promptTemplates: z.array(promptTemplateSchema).min(1),
});

export type CategoryGuide = z.infer<typeof categoryGuideSchema>;
export type PromptTemplate = z.infer<typeof promptTemplateSchema>;
