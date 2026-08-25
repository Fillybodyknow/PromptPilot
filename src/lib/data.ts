import { z } from "zod";
import { categoryGuideSchema, type CategoryGuide } from "./schema";
import {
  CATEGORIES,
  getCategory,
  getCategoriesGrouped,
  type CategoryMeta,
} from "./categories";

import generalAssistant from "@/data/general-assistant.json";
import businessWriting from "@/data/business-writing.json";
import presentations from "@/data/presentations.json";
import codingModels from "@/data/coding-models.json";
import codingTools from "@/data/coding-tools.json";
import dataAnalysis from "@/data/data-analysis.json";
import researchDocs from "@/data/research-docs.json";
import imageGen from "@/data/image-gen.json";
import designUi from "@/data/design-ui.json";
import meetingsTranscription from "@/data/meetings-transcription.json";
import translation from "@/data/translation.json";
import automation from "@/data/automation.json";
import openWeightSelfhosted from "@/data/open-weight-selfhosted.json";

import businessWritingGuide from "@/data/guides/business-writing.json";
import generalAssistantGuide from "@/data/guides/general-assistant.json";
import codingToolsGuide from "@/data/guides/coding-tools.json";
import researchDocsGuide from "@/data/guides/research-docs.json";
import dataAnalysisGuide from "@/data/guides/data-analysis.json";
import presentationsGuide from "@/data/guides/presentations.json";
import translationGuide from "@/data/guides/translation.json";
import automationGuide from "@/data/guides/automation.json";
import meetingsTranscriptionGuide from "@/data/guides/meetings-transcription.json";
import designUiGuide from "@/data/guides/design-ui.json";
import imageGenGuide from "@/data/guides/image-gen.json";
import selfHostedGuide from "@/data/guides/self-hosted.json";

/**
 * แมป category key -> raw JSON (ยังไม่ validate)
 * ไฟล์ JSON เหล่านี้คือ "แหล่งข้อมูลตั้งต้น" ที่ auto-update pipeline / admin จะแก้ไขในอนาคต
 */
const RAW_DATA: Record<string, unknown[]> = {
  "general-assistant": generalAssistant,
  "business-writing": businessWriting,
  presentations: presentations,
  "coding-models": codingModels,
  "coding-tools": codingTools,
  "data-analysis": dataAnalysis,
  "research-docs": researchDocs,
  "image-gen": imageGen,
  "design-ui": designUi,
  "meetings-transcription": meetingsTranscription,
  translation: translation,
  automation: automation,
  "self-hosted": openWeightSelfhosted,
};

/**
 * แมป category key -> raw guide JSON (ยังไม่ validate) — ไม่ใช่ทุกหมวดจะมี guide
 * ตอนนี้มีแค่ business-writing เป็นตัวอย่าง หมวดอื่นจะทยอยเพิ่ม
 */
const RAW_GUIDES: Record<string, unknown> = {
  "business-writing": businessWritingGuide,
  "general-assistant": generalAssistantGuide,
  "coding-tools": codingToolsGuide,
  "research-docs": researchDocsGuide,
  "data-analysis": dataAnalysisGuide,
  presentations: presentationsGuide,
  translation: translationGuide,
  automation: automationGuide,
  "meetings-transcription": meetingsTranscriptionGuide,
  "design-ui": designUiGuide,
  "image-gen": imageGenGuide,
  "self-hosted": selfHostedGuide,
};

/**
 * อ่าน + validate entries ของหมวดเดียว ด้วย Zod schema ของหมวดนั้น
 * โยน error ที่อ่านง่ายถ้า JSON ไม่ตรง schema — กัน "ข้อมูลผิดรูปแบบหลุดขึ้นเว็บ"
 * ตั้งแต่ตอน build (ตาม caveat ในข้อมูลตั้งต้นเรื่องความน่าเชื่อถือของข้อมูล)
 */
export function getCategoryEntries<T = unknown>(key: string): T[] {
  const category = getCategory(key);
  if (!category) {
    throw new Error(`ไม่พบหมวด "${key}" ใน CATEGORIES`);
  }

  const raw = RAW_DATA[key];
  if (!raw) {
    throw new Error(`ไม่พบไฟล์ข้อมูลสำหรับหมวด "${key}"`);
  }

  const result = z.array(category.schema).safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - [${issue.path.join(".")}] ${issue.message}`)
      .join("\n");
    throw new Error(
      `ข้อมูลในหมวด "${key}" (src/data/${key}.json) ไม่ตรง schema:\n${issues}`
    );
  }

  return result.data as T[];
}

/**
 * อ่าน + validate guide ("วิธีใช้งาน" + "เขียน prompt" + "ติดตั้ง") ของหมวดเดียว
 * คืน null ถ้าหมวดนั้นยังไม่มี guide (ยังไม่ error — เพราะไม่ใช่ทุกหมวดต้องมี)
 */
export function getCategoryGuide(key: string): CategoryGuide | null {
  const raw = RAW_GUIDES[key];
  if (!raw) return null;

  const result = categoryGuideSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - [${issue.path.join(".")}] ${issue.message}`)
      .join("\n");
    throw new Error(
      `Guide ของหมวด "${key}" (src/data/guides/${key}.json) ไม่ตรง schema:\n${issues}`
    );
  }

  return result.data;
}

export interface CategoryWithEntries extends CategoryMeta {
  entries: Record<string, unknown>[];
}

/** ใช้ทำหน้ารายการหมวดทั้งหมด (หน้าแรก) */
export function getAllCategoriesWithEntries(): CategoryWithEntries[] {
  return CATEGORIES.map((category) => ({
    ...category,
    entries: getCategoryEntries(category.key),
  }));
}

export { CATEGORIES, getCategory, getCategoriesGrouped };
