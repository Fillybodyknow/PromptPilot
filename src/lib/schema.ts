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
// หมวด 1 — LLM หลัก / reasoning / งานซับซ้อน
// ---------------------------------------------------------------------------
export const llmCoreSchema = baseEntrySchema.extend({
  modelId: z.string().optional(),
  releaseDate: z.string().optional(),
  benchmark: z.string(),
  priceUsdIn: z.number().nullable(),
  priceUsdOut: z.number().nullable(),
  bestFor: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 2 — งานเขียนบทความ / creative / copywriting
// ---------------------------------------------------------------------------
export const writingSchema = baseEntrySchema.extend({
  strength: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 3ก — งานเขียนโปรแกรม: โมเดล
// ---------------------------------------------------------------------------
export const codingModelsSchema = baseEntrySchema.extend({
  sweBenchVerified: z.string(),
  note: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 3ข — งานเขียนโปรแกรม: เครื่องมือ/IDE/agent
// ---------------------------------------------------------------------------
export const codingToolsSchema = baseEntrySchema.extend({
  toolType: z.enum(["ide", "cli-agent", "plugin", "cloud-agent"]),
  price: z.string(),
  bestFor: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 4 — งานเจนรูป
// ---------------------------------------------------------------------------
export const imageGenSchema = baseEntrySchema.extend({
  pricePerThousand: z.string().optional(),
  strength: z.string(),
  licenseNote: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 5 — งานเจนวิดีโอ
// ---------------------------------------------------------------------------
export const videoGenSchema = baseEntrySchema.extend({
  strength: z.string(),
  audioSupport: z.boolean(),
  priceAccess: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 6 — งานเสียง (TTS / voice cloning / เพลง / STT)
// ---------------------------------------------------------------------------
export const audioSchema = baseEntrySchema.extend({
  type: z.enum(["tts", "voice-clone", "music", "stt"]),
  pricing: z.string(),
  licenseNote: z.string().optional(),
});

// ---------------------------------------------------------------------------
// หมวด 7 — งานเอกสาร / วิจัย
// ---------------------------------------------------------------------------
export const researchDocsSchema = baseEntrySchema.extend({
  strength: z.string(),
  pricing: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 8 — งานออกแบบ UI/UX + กราฟิก
// ---------------------------------------------------------------------------
export const designUiSchema = baseEntrySchema.extend({
  strength: z.string(),
  pricing: z.string(),
  integration: z.string().optional(),
});

// ---------------------------------------------------------------------------
// หมวด 9 — งานวิเคราะห์ข้อมูล / spreadsheet / BI
// ---------------------------------------------------------------------------
export const dataAnalysisSchema = baseEntrySchema.extend({
  strength: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 10 — งานแปล / subtitle
// ---------------------------------------------------------------------------
export const translationSchema = baseEntrySchema.extend({
  strength: z.string(),
  scope: z.enum(["international", "thai"]),
});

// ---------------------------------------------------------------------------
// หมวด 11 — Automation / เชื่อมระบบ
// ---------------------------------------------------------------------------
export const automationSchema = baseEntrySchema.extend({
  strength: z.string(),
  pricingModel: z.string(),
  selfHost: z.boolean(),
});

// ---------------------------------------------------------------------------
// หมวด 12 — Browser / computer-use agents
// ---------------------------------------------------------------------------
export const browserAgentsSchema = baseEntrySchema.extend({
  strength: z.string(),
  maturity: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 13 — งาน 3D / เกม
// ---------------------------------------------------------------------------
export const threedGamingSchema = baseEntrySchema.extend({
  license: z.string(),
  strength: z.string(),
  freeTierLicense: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 14 — Open-weight self-hosted
// ---------------------------------------------------------------------------
export const openWeightSelfhostedSchema = baseEntrySchema.extend({
  vramTier: z.string(),
  recommendedRunner: z.string(),
  licenseNote: z.string(),
});

// ---------------------------------------------------------------------------
// หมวด 15 — โมเดลภาษาไทยโดยเฉพาะ
// ---------------------------------------------------------------------------
export const thaiModelsSchema = baseEntrySchema.extend({
  modelId: z.string(),
  baseModel: z.string(),
  sizeParams: z.string(),
  benchmark: z.string(),
  license: z.string(),
});
