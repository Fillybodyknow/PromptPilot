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
  schema: z.ZodTypeAny;
  columns: ColumnDef[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "llm-core",
    titleTh: "LLM หลัก / Reasoning",
    descriptionTh: "โมเดลภาษาหลักสำหรับงานคิดวิเคราะห์ซับซ้อนและ agentic",
    schema: schemas.llmCoreSchema,
    columns: [
      { key: "benchmark", labelTh: "Benchmark" },
      { key: "priceUsdIn", labelTh: "ราคา Input (USD/1M token)" },
      { key: "priceUsdOut", labelTh: "ราคา Output (USD/1M token)" },
      { key: "bestFor", labelTh: "เหมาะกับ" },
    ],
  },
  {
    key: "writing",
    titleTh: "งานเขียนบทความ / Creative",
    descriptionTh: "เขียนบทความ, copywriting, งานสร้างสรรค์",
    schema: schemas.writingSchema,
    columns: [{ key: "strength", labelTh: "จุดเด่น" }],
  },
  {
    key: "coding-models",
    titleTh: "เขียนโปรแกรม — โมเดล",
    descriptionTh: "โมเดลที่ใช้เป็น backend งานวิศวกรรมซอฟต์แวร์",
    schema: schemas.codingModelsSchema,
    columns: [
      { key: "sweBenchVerified", labelTh: "SWE-bench Verified" },
      { key: "note", labelTh: "หมายเหตุ" },
    ],
  },
  {
    key: "coding-tools",
    titleTh: "เขียนโปรแกรม — เครื่องมือ/IDE/Agent",
    descriptionTh: "IDE, CLI agent, ปลั๊กอิน สำหรับงานโค้ด",
    schema: schemas.codingToolsSchema,
    columns: [
      { key: "toolType", labelTh: "ประเภท" },
      { key: "price", labelTh: "ราคา" },
      { key: "bestFor", labelTh: "เหมาะกับ" },
    ],
  },
  {
    key: "image-gen",
    titleTh: "งานเจนรูป",
    descriptionTh: "Text-to-image และ image editing",
    schema: schemas.imageGenSchema,
    columns: [
      { key: "pricePerThousand", labelTh: "ราคา/1,000 รูป" },
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "licenseNote", labelTh: "License/พาณิชย์" },
    ],
  },
  {
    key: "video-gen",
    titleTh: "งานเจนวิดีโอ",
    descriptionTh: "Text-to-video และ image-to-video",
    schema: schemas.videoGenSchema,
    columns: [
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "audioSupport", labelTh: "มีเสียง" },
      { key: "priceAccess", labelTh: "ราคา/การเข้าถึง" },
    ],
  },
  {
    key: "audio",
    titleTh: "งานเสียง (TTS / เพลง / STT)",
    descriptionTh: "Text-to-speech, voice cloning, เจนเพลง, speech-to-text",
    schema: schemas.audioSchema,
    columns: [
      { key: "type", labelTh: "ประเภท" },
      { key: "pricing", labelTh: "ราคา" },
      { key: "licenseNote", labelTh: "License/พาณิชย์" },
    ],
  },
  {
    key: "research-docs",
    titleTh: "งานเอกสาร / วิจัย",
    descriptionTh: "สรุปเอกสาร, systematic review, deep research",
    schema: schemas.researchDocsSchema,
    columns: [
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "pricing", labelTh: "ราคา" },
    ],
  },
  {
    key: "design-ui",
    titleTh: "งานออกแบบ UI/UX + กราฟิก",
    descriptionTh: "Text-to-UI, component generation, งานออกแบบ",
    schema: schemas.designUiSchema,
    columns: [
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "pricing", labelTh: "ราคา" },
      { key: "integration", labelTh: "เชื่อมต่อกับ" },
    ],
  },
  {
    key: "data-analysis",
    titleTh: "งานวิเคราะห์ข้อมูล / BI",
    descriptionTh: "EDA, กราฟ, สรุปเชิงสถิติ, spreadsheet",
    schema: schemas.dataAnalysisSchema,
    columns: [{ key: "strength", labelTh: "จุดเด่น" }],
  },
  {
    key: "translation",
    titleTh: "งานแปล / Subtitle",
    descriptionTh: "แปลภาษาสากลและไทย↔อังกฤษเฉพาะทาง",
    schema: schemas.translationSchema,
    columns: [
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "scope", labelTh: "ขอบเขต" },
    ],
  },
  {
    key: "automation",
    titleTh: "Automation / เชื่อมระบบ",
    descriptionTh: "Workflow automation และ MCP",
    schema: schemas.automationSchema,
    columns: [
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "pricingModel", labelTh: "โมเดลราคา" },
      { key: "selfHost", labelTh: "Self-host ได้" },
    ],
  },
  {
    key: "browser-agents",
    titleTh: "Browser / Computer-use Agents",
    descriptionTh: "Agent ที่คุมเบราว์เซอร์/หน้าจอ",
    schema: schemas.browserAgentsSchema,
    columns: [
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "maturity", labelTh: "ความพร้อมใช้งาน" },
    ],
  },
  {
    key: "threed-gaming",
    titleTh: "งาน 3D / เกม",
    descriptionTh: "สร้างโมเดล 3D สำหรับเกมและงานออกแบบ",
    schema: schemas.threedGamingSchema,
    columns: [
      { key: "license", labelTh: "License" },
      { key: "strength", labelTh: "จุดเด่น" },
      { key: "freeTierLicense", labelTh: "License free tier" },
    ],
  },
  {
    key: "open-weight-selfhosted",
    titleTh: "Open-weight Self-hosted",
    descriptionTh: "โมเดลรันเองตาม tier ฮาร์ดแวร์",
    schema: schemas.openWeightSelfhostedSchema,
    columns: [
      { key: "vramTier", labelTh: "Tier ฮาร์ดแวร์" },
      { key: "recommendedRunner", labelTh: "รันด้วย" },
      { key: "licenseNote", labelTh: "License" },
    ],
  },
  {
    key: "thai-models",
    titleTh: "โมเดลภาษาไทยโดยเฉพาะ",
    descriptionTh: "โมเดลที่พัฒนา/ปรับแต่งเฉพาะภาษาไทย",
    schema: schemas.thaiModelsSchema,
    columns: [
      { key: "modelId", labelTh: "Model ID" },
      { key: "baseModel", labelTh: "ฐาน/ขนาด" },
      { key: "benchmark", labelTh: "Benchmark" },
      { key: "license", labelTh: "License" },
    ],
  },
];

export function getCategory(key: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key);
}
