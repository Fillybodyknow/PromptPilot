import { z } from "zod";
import { CATEGORIES, getCategory, type CategoryMeta } from "./categories";

import llmCore from "@/data/llm-core.json";
import writing from "@/data/writing.json";
import codingModels from "@/data/coding-models.json";
import codingTools from "@/data/coding-tools.json";
import imageGen from "@/data/image-gen.json";
import videoGen from "@/data/video-gen.json";
import audio from "@/data/audio.json";
import researchDocs from "@/data/research-docs.json";
import designUi from "@/data/design-ui.json";
import dataAnalysis from "@/data/data-analysis.json";
import translation from "@/data/translation.json";
import automation from "@/data/automation.json";
import browserAgents from "@/data/browser-agents.json";
import threedGaming from "@/data/threed-gaming.json";
import openWeightSelfhosted from "@/data/open-weight-selfhosted.json";
import thaiModels from "@/data/thai-models.json";

/**
 * แมป category key -> raw JSON (ยังไม่ validate)
 * ไฟล์ JSON เหล่านี้คือ "แหล่งข้อมูลตั้งต้น" ที่ auto-update pipeline / admin จะแก้ไขในอนาคต
 */
const RAW_DATA: Record<string, unknown[]> = {
  "llm-core": llmCore,
  writing: writing,
  "coding-models": codingModels,
  "coding-tools": codingTools,
  "image-gen": imageGen,
  "video-gen": videoGen,
  audio: audio,
  "research-docs": researchDocs,
  "design-ui": designUi,
  "data-analysis": dataAnalysis,
  translation: translation,
  automation: automation,
  "browser-agents": browserAgents,
  "threed-gaming": threedGaming,
  "open-weight-selfhosted": openWeightSelfhosted,
  "thai-models": thaiModels,
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

export { CATEGORIES, getCategory };
