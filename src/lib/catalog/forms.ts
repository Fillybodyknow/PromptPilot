import { z } from "zod";
import type { CategoryMeta } from "@/lib/categories";
import { categoryGuideSchema, promptTemplateSchema, type CategoryGuide, type PromptTemplate } from "@/lib/schema";
import type { GuideFields } from "./admin";

// แปลงค่าจากฟอร์มในหน้า admin → object ตามรูปแบบ JSON เดิม แล้วตรวจด้วย Zod schema เดียวกับที่หน้าเว็บใช้อ่าน
// ช่องว่าง = ไม่มีค่า: ฟิลด์ nullable ได้ null, ฟิลด์ optional ได้ undefined (schema ไม่รับ null)

export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const LABELS: Record<string, string> = {
  id: "รหัส (slug)",
  name: "ชื่อ",
  vendor: "ผู้ให้บริการ",
  modelId: "Model ID",
  releaseDate: "วันที่เปิดตัว",
  sourceLabel: "ประเภทแหล่งข้อมูล",
  verifiedAt: "วันที่ตรวจล่าสุด",
  status: "สถานะ",
  url: "ลิงก์ทางการ",
  sourceUrl: "ลิงก์แหล่งอ้างอิง",
  benchmark: "ผลทดสอบ",
  priceUsdIn: "ราคา input",
  priceUsdOut: "ราคา output",
  priceNote: "รายละเอียดราคา",
  bestFor: "เหมาะกับ",
  summary: "สรุปจุดเด่น/จุดอ่อน",
  warning: "ข้อควรระวัง",
  accessMethod: "วิธีเข้าถึง",
  installSteps: "ขั้นตอนติดตั้ง",
  tags: "แท็ก",
  howToUse: "ใช้ AI กับงานนี้อย่างไร",
  dataHandlingNote: "ข้อมูลที่ห้ามวางลงใน AI",
  links: "ลิงก์เริ่มใช้งาน",
  task: "งานที่ prompt นี้ใช้ทำ",
  badPrompt: "prompt แบบที่ได้ผลไม่ดี",
  goodPrompt: "prompt แบบที่แนะนำ",
  why: "ทำไมได้ผล",
  tested: "ทดสอบแล้ว",
  testedAt: "วันที่ทดสอบ",
  testedWith: "ทดสอบกับ",
  sampleOutput: "ตัวอย่างผลลัพธ์",
  draftNote: "หมายเหตุร่าง",
};

function toErrors(error: z.ZodError, extraLabels: Record<string, string> = {}): string[] {
  return error.issues.map((i) => {
    const key = String(i.path[0] ?? "");
    const label = extraLabels[key] ?? LABELS[key] ?? key;
    return label ? `${label}: ${i.message}` : i.message;
  });
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nullable = (fd: FormData, k: string) => str(fd, k) || null;
const optional = (fd: FormData, k: string) => str(fd, k) || undefined;
const lines = (fd: FormData, k: string) =>
  str(fd, k)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
const list = (fd: FormData, k: string) =>
  str(fd, k)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
function num(fd: FormData, k: string): number | null | string {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v; // ส่งค่าที่ไม่ใช่ตัวเลขต่อไปให้ schema แจ้ง error
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

// ความยาวสูงสุดตามขนาดคอลัมน์ใน src/db/schema.ts — คอลัมน์ text เก็บได้ 65,535 ไบต์ (ภาษาไทยตัวละ 3 ไบต์)
const MAX_LEN: Record<string, number> = { name: 200, vendor: 200, modelId: 200, releaseDate: 50 };
const MAX_TEXT = 15_000;
const URL_KEYS = new Set(["url", "sourceUrl"]);

/** ตรวจก่อนส่งให้ schema: ความยาวไม่เกินคอลัมน์ และลิงก์ต้องเป็น http(s) เท่านั้น (กัน javascript: และอื่นๆ) */
export function precheck(values: Record<string, unknown>, labels: Record<string, string> = {}): string[] {
  const errors: string[] = [];
  const label = (k: string) => labels[k] ?? LABELS[k] ?? k;
  const check = (k: string, v: unknown) => {
    if (typeof v !== "string") return;
    const max = MAX_LEN[k] ?? MAX_TEXT;
    if (v.length > max) errors.push(`${label(k)}: ยาวเกิน ${max.toLocaleString()} ตัวอักษร`);
    if (URL_KEYS.has(k) && v && !/^https?:\/\//i.test(v)) errors.push(`${label(k)}: ต้องขึ้นต้นด้วย http:// หรือ https://`);
  };
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v)) v.forEach((x) => (typeof x === "object" && x ? Object.entries(x).forEach(([kk, vv]) => check(kk, vv)) : check(k, x)));
    else check(k, v);
  }
  return errors;
}

export function parseToolForm(fd: FormData, category: CategoryMeta): Parsed<Record<string, unknown>> {
  const id = str(fd, "id");
  if (!SLUG_RE.test(id)) return { ok: false, errors: ["รหัส (slug): ใช้ได้เฉพาะ a-z, 0-9 และ - ขึ้นต้นด้วยตัวอักษรหรือตัวเลข"] };
  const tags = list(fd, "tags");
  const entry: Record<string, unknown> = {
    id,
    name: str(fd, "name"),
    vendor: str(fd, "vendor"),
    modelId: nullable(fd, "modelId"),
    releaseDate: str(fd, "releaseDate"),
    sourceLabel: str(fd, "sourceLabel"),
    verifiedAt: str(fd, "verifiedAt"),
    status: str(fd, "status"),
    url: str(fd, "url"),
    sourceUrl: nullable(fd, "sourceUrl"),
    benchmark: nullable(fd, "benchmark"),
    priceUsdIn: num(fd, "priceUsdIn"),
    priceUsdOut: num(fd, "priceUsdOut"),
    priceNote: str(fd, "priceNote"),
    bestFor: str(fd, "bestFor"),
    summary: str(fd, "summary"),
    warning: nullable(fd, "warning"),
    accessMethod: str(fd, "accessMethod"),
    installSteps: lines(fd, "installSteps"),
    ...(tags.length ? { tags } : {}),
  };
  for (const col of category.columns) entry[col.key] = str(fd, col.key);
  const colLabels = Object.fromEntries(category.columns.map((c) => [c.key, c.labelTh]));
  const pre = precheck(entry, colLabels);
  if (pre.length) return { ok: false, errors: pre };
  const parsed = category.schema.safeParse(entry);
  return parsed.success ? { ok: true, data: parsed.data as Record<string, unknown> } : { ok: false, errors: toErrors(parsed.error, colLabels) };
}

const guideFieldsSchema = categoryGuideSchema.omit({ promptTemplates: true, categoryKey: true });

export function parseGuideForm(fd: FormData): Parsed<GuideFields> {
  const links: { label: string; url: string }[] = [];
  for (const line of lines(fd, "links")) {
    const sep = line.lastIndexOf("|");
    if (sep < 0) return { ok: false, errors: [`ลิงก์เริ่มใช้งาน: บรรทัด "${line}" ต้องเขียนแบบ "ชื่อ | URL"`] };
    links.push({ label: line.slice(0, sep).trim(), url: line.slice(sep + 1).trim() });
  }
  const steps = lines(fd, "installSteps");
  const raw: Record<string, unknown> = {
    howToUse: str(fd, "howToUse"),
    accessMethod: str(fd, "accessMethod"),
    dataHandlingNote: str(fd, "dataHandlingNote"),
    links: links.length ? links : undefined,
    installSteps: steps.length ? steps : undefined,
    benchmarkNote: optional(fd, "benchmarkNote"),
    thaiContextNote: optional(fd, "thaiContextNote"),
    adoptionNote: optional(fd, "adoptionNote"),
    costNote: optional(fd, "costNote"),
    accuracyNote: optional(fd, "accuracyNote"),
  };
  const pre = precheck(raw);
  if (pre.length) return { ok: false, errors: pre };
  const parsed = guideFieldsSchema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data as Omit<CategoryGuide, "promptTemplates" | "categoryKey"> } : { ok: false, errors: toErrors(parsed.error) };
}

export function parsePromptForm(fd: FormData): Parsed<PromptTemplate> {
  const tested = fd.get("tested") === "on";
  const raw: Record<string, unknown> = {
    task: str(fd, "task"),
    badPrompt: optional(fd, "badPrompt"),
    goodPrompt: str(fd, "goodPrompt"),
    why: str(fd, "why"),
    tested,
    testedAt: nullable(fd, "testedAt"),
    testedWith: list(fd, "testedWith"),
    sampleOutput: nullable(fd, "sampleOutput"),
    draftNote: nullable(fd, "draftNote"),
    sourceUrl: optional(fd, "sourceUrl"),
  };
  const pre = precheck(raw);
  if (pre.length) return { ok: false, errors: pre };
  const parsed = promptTemplateSchema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, errors: toErrors(parsed.error) };
}

// ---------------------------------------------------------------------------
// ทางกลับ: ข้อมูลเดิม → ค่าเริ่มต้นของช่องในฟอร์ม (ต้องเป็นคู่กับ parse*Form ข้างบน — บันทึกโดยไม่แก้อะไรต้องได้ข้อมูลเดิม)
// ---------------------------------------------------------------------------

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function toolFormValues(entry: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(entry)) {
    if (k === "installSteps") values[k] = (v as string[]).join("\n");
    else if (k === "tags") values[k] = (v as string[]).join(", ");
    else values[k] = text(v);
  }
  return values;
}

export function guideFormValues(g: Partial<CategoryGuide>): Record<string, string> {
  return {
    howToUse: text(g.howToUse),
    accessMethod: text(g.accessMethod),
    dataHandlingNote: text(g.dataHandlingNote),
    links: (g.links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n"),
    installSteps: (g.installSteps ?? []).join("\n"),
    benchmarkNote: text(g.benchmarkNote),
    thaiContextNote: text(g.thaiContextNote),
    adoptionNote: text(g.adoptionNote),
    costNote: text(g.costNote),
    accuracyNote: text(g.accuracyNote),
  };
}

export function promptFormValues(p: Partial<PromptTemplate>): Record<string, string> {
  return {
    task: text(p.task),
    badPrompt: text(p.badPrompt),
    goodPrompt: text(p.goodPrompt),
    why: text(p.why),
    tested: p.tested ? "on" : "",
    testedAt: text(p.testedAt),
    testedWith: (p.testedWith ?? []).join(", "),
    sampleOutput: text(p.sampleOutput),
    draftNote: text(p.draftNote),
    sourceUrl: text(p.sourceUrl),
  };
}

const sourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.url().max(2000).refine((u) => /^https?:\/\//i.test(u), "ต้องขึ้นต้นด้วย http:// หรือ https://"),
});

export function parseSourceForm(fd: FormData): Parsed<{ name: string; url: string }> {
  const parsed = sourceSchema.safeParse({ name: str(fd, "name"), url: str(fd, "url") });
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, errors: toErrors(parsed.error, { name: "ชื่อแหล่งข่าว", url: "URL ของ RSS feed" }) };
}
