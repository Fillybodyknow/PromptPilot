import {
  boolean,
  char,
  date,
  datetime,
  decimal,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { NEWS_STATUSES } from "../lib/news/schema";
import { accessMethodEnum, sourceLabelEnum, statusEnum } from "../lib/schema";

const values = <T extends string>(xs: readonly T[]) => xs as [T, ...T[]];

// ---------------------------------------------------------------------------
// เครื่องมือและคู่มือ — ตรวจรูปแบบด้วย Zod schema เดิมใน src/lib/schema.ts ทั้งตอนเขียนและตอนอ่าน
// ---------------------------------------------------------------------------

export const tools = mysqlTable(
  "tools",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryKey: varchar("category_key", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    name: varchar("name", { length: 200 }).notNull(),
    vendor: varchar("vendor", { length: 200 }).notNull(),
    modelId: varchar("model_id", { length: 200 }),
    releaseDate: varchar("release_date", { length: 50 }).notNull(),
    sourceLabel: mysqlEnum("source_label", values(sourceLabelEnum.options)).notNull(),
    verifiedAt: date("verified_at", { mode: "string" }).notNull(),
    status: mysqlEnum("status", values(statusEnum.options)).notNull(),
    url: text("url").notNull(),
    sourceUrl: text("source_url"),
    benchmark: text("benchmark"),
    priceUsdIn: double("price_usd_in"),
    priceUsdOut: double("price_usd_out"),
    priceNote: text("price_note").notNull(),
    bestFor: text("best_for").notNull(),
    summary: text("summary").notNull(),
    warning: text("warning"),
    accessMethod: mysqlEnum("access_method", values(accessMethodEnum.options)).notNull(),
    installSteps: json("install_steps").$type<string[]>().notNull(),
    tags: json("tags").$type<string[] | null>(),
    // ฟิลด์เฉพาะบางหมวด (outputType, researchType, thaiSupport, hardwareNote)
    extra: json("extra").$type<Record<string, unknown>>().notNull(),
    featured: boolean("featured").notNull().default(false),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
    updatedBy: varchar("updated_by", { length: 100 }),
  },
  (t) => [uniqueIndex("uq_tools_category_slug").on(t.categoryKey, t.slug), index("idx_tools_category_order").on(t.categoryKey, t.sortOrder)],
);

export const guides = mysqlTable("guides", {
  categoryKey: varchar("category_key", { length: 64 }).primaryKey(),
  howToUse: text("how_to_use").notNull(),
  accessMethod: mysqlEnum("access_method", values(accessMethodEnum.options)).notNull(),
  links: json("links").$type<{ label: string; url: string }[] | null>(),
  installSteps: json("install_steps").$type<string[] | null>(),
  dataHandlingNote: text("data_handling_note").notNull(),
  // benchmarkNote, thaiContextNote, adoptionNote, costNote, accuracyNote — มีเฉพาะบางหมวด
  notes: json("notes").$type<Record<string, string>>().notNull(),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
  updatedBy: varchar("updated_by", { length: 100 }),
});

export const promptTemplates = mysqlTable(
  "prompt_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryKey: varchar("category_key", { length: 64 })
      .notNull()
      .references(() => guides.categoryKey, { onDelete: "cascade" }),
    sortOrder: int("sort_order").notNull().default(0),
    task: text("task").notNull(),
    badPrompt: text("bad_prompt"),
    goodPrompt: text("good_prompt").notNull(),
    why: text("why").notNull(),
    tested: boolean("tested").notNull(),
    testedAt: date("tested_at", { mode: "string" }),
    testedWith: json("tested_with").$type<string[]>().notNull(),
    sampleOutput: text("sample_output"),
    draftNote: text("draft_note"),
    sourceUrl: text("source_url"),
  },
  (t) => [index("idx_prompt_templates_category_order").on(t.categoryKey, t.sortOrder)],
);

export const newsSources = mysqlTable("news_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
});

// ---------------------------------------------------------------------------
// ข่าว
// ---------------------------------------------------------------------------

export const newsItems = mysqlTable(
  "news_items",
  {
    id: char("id", { length: 16 }).primaryKey(),
    url: text("url").notNull(),
    source: varchar("source", { length: 200 }).notNull(),
    title: text("title").notNull(),
    snippet: text("snippet").notNull(),
    publishedAt: datetime("published_at", { mode: "date", fsp: 3 }).notNull(),
    fetchedAt: datetime("fetched_at", { mode: "date", fsp: 3 }).notNull(),
    titleTh: varchar("title_th", { length: 500 }),
    summaryTh: text("summary_th"),
    importance: tinyint("importance"),
    aiReason: text("ai_reason"),
    // คำแนะนำต่อบทบาท — AI ร่าง ทีมแก้ในหน้า admin ก่อนอนุมัติ
    roleEmployee: text("role_employee"),
    roleIt: text("role_it"),
    roleExec: text("role_exec"),
    // ข่าวหลักของเรื่องนี้ (มีค่าเมื่อ status = duplicate)
    duplicateOf: char("duplicate_of", { length: 16 }),
    status: mysqlEnum("status", NEWS_STATUSES).notNull(),
    reviewedBy: varchar("reviewed_by", { length: 100 }),
    reviewedAt: datetime("reviewed_at", { mode: "date", fsp: 3 }),
  },
  (t) => [
    index("idx_news_status_published").on(t.status, t.publishedAt),
    index("idx_news_duplicate_of").on(t.duplicateOf),
  ],
);

// แยกเป็นตาราง (ไม่เก็บเป็น JSON) เพื่อกรองข่าวตามหมวดผ่าน index ได้
export const newsCategories = mysqlTable(
  "news_categories",
  {
    newsId: char("news_id", { length: 16 })
      .notNull()
      .references(() => newsItems.id, { onDelete: "cascade" }),
    categoryKey: varchar("category_key", { length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.newsId, t.categoryKey] }), index("idx_news_categories_key").on(t.categoryKey)],
);

// ข่าวพูดถึงเครื่องมือตัวไหน — ผูกด้วย id ของแถว (ไม่ใช่ slug) เพื่อให้เปลี่ยน slug ได้โดยลิงก์ไม่หลุด
export const newsTools = mysqlTable(
  "news_tools",
  {
    newsId: char("news_id", { length: 16 })
      .notNull()
      .references(() => newsItems.id, { onDelete: "cascade" }),
    toolId: int("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.newsId, t.toolId] }), index("idx_news_tools_tool").on(t.toolId)],
);

export const fetchRuns = mysqlTable("fetch_runs", {
  id: int("id").autoincrement().primaryKey(),
  triggeredBy: varchar("triggered_by", { length: 100 }).notNull(),
  startedAt: datetime("started_at", { mode: "date", fsp: 3 }).notNull(),
  finishedAt: datetime("finished_at", { mode: "date", fsp: 3 }),
  status: mysqlEnum("status", ["running", "ok", "failed"]).notNull(),
  message: text("message"),
});

// ---------------------------------------------------------------------------
// ผู้ใช้หน้า admin (login ด้วย Microsoft Entra ID เท่านั้น) และ session ที่ login อยู่
// ---------------------------------------------------------------------------

export const USER_ROLES = ["admin", "editor", "viewer"] as const;
export const USER_STATUSES = ["pending", "active", "rejected", "disabled"] as const;
/** member = พนักงาน (tenant บริษัท), guest = ถูกเชิญเข้า tenant บริษัท, external = บัญชีองค์กรอื่น, personal = บัญชี Microsoft ส่วนตัว */
export const ACCOUNT_TYPES = ["member", "guest", "external", "personal"] as const;

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    // tenant + object ID ของผู้ใช้ใน Entra ID — ไม่เปลี่ยนตลอดอายุบัญชี ใช้ระบุตัวตนแทนอีเมล (อีเมลเปลี่ยน/ถูกนำไปใช้ซ้ำได้)
    // oid ไม่รับประกันว่าไม่ซ้ำข้าม tenant จึงต้องใช้คู่กับ tid ("" = แถวจากก่อนรองรับหลาย tenant ซึ่งเป็น tenant บริษัททั้งหมด)
    msTid: varchar("ms_tid", { length: 64 }).notNull().default(""),
    msOid: varchar("ms_oid", { length: 64 }).notNull(),
    accountType: mysqlEnum("account_type", ACCOUNT_TYPES).notNull().default("member"),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    // admin = ผู้ดูแลระบบ (จัดการผู้ใช้ได้), editor = ผู้ดูแลเนื้อหา (ใช้หน้า admin), viewer = ผู้อ่าน (พนักงานทั่วไป)
    role: mysqlEnum("role", USER_ROLES).notNull().default("viewer"),
    status: mysqlEnum("status", USER_STATUSES).notNull().default("pending"),
    requestedAt: datetime("requested_at", { mode: "date", fsp: 3 }).notNull(),
    decidedBy: varchar("decided_by", { length: 320 }),
    decidedAt: datetime("decided_at", { mode: "date", fsp: 3 }),
    lastLoginAt: datetime("last_login_at", { mode: "date", fsp: 3 }),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
  },
  (t) => [uniqueIndex("uq_users_ms_identity").on(t.msTid, t.msOid), index("idx_users_status").on(t.status)],
);

export const sessions = mysqlTable(
  "sessions",
  {
    // sha256 ของ token ใน cookie — ถ้าตารางนี้หลุด ก็เอาไปปลอมเป็น cookie ไม่ได้
    id: char("id", { length: 64 }).primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_sessions_user").on(t.userId), index("idx_sessions_expires").on(t.expiresAt)],
);

// ---------------------------------------------------------------------------
// ค่าตั้งค่าระบบที่ปรับได้จากหน้า admin (ใช้ร่วมกันระหว่างเว็บและสคริปต์ดึงข่าว)
// ---------------------------------------------------------------------------

export const appSettings = mysqlTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: varchar("value", { length: 1000 }).notNull(),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
  updatedBy: varchar("updated_by", { length: 320 }),
});

// ---------------------------------------------------------------------------
// ให้ AI ช่วยตรวจ/อัปเดตเครื่องมือและคู่มือ — AI เสนอเป็น "ข้อเสนอแก้ไข" แล้วคนอนุมัติ ไม่แก้ข้อมูลเอง
// ---------------------------------------------------------------------------

/** tool = แก้ข้อมูลเครื่องมือ, guide = แก้คู่มือหมวด, prompt = prompt ตัวอย่างใหม่, new_tool = เครื่องมือที่ควรเพิ่ม (targetKey = หมวด สำหรับ 3 แบบหลัง) */
export const SUGGESTION_TARGETS = ["tool", "guide", "prompt", "new_tool"] as const;
export const SUGGESTION_STATUSES = ["pending", "accepted", "partial", "rejected", "expired", "superseded"] as const;

/** ข้อเสนอแก้ไขหนึ่งรายการ: changes = [{ field, before, after, evidenceUrl, quote, reason }] */
export const contentSuggestions = mysqlTable(
  "content_suggestions",
  {
    id: int("id").autoincrement().primaryKey(),
    targetType: mysqlEnum("target_type", SUGGESTION_TARGETS).notNull(),
    // tools.id (เป็นข้อความ) หรือ guides.category_key
    targetKey: varchar("target_key", { length: 100 }).notNull(),
    changes: json("changes").$type<SuggestedChange[]>().notNull(),
    summary: text("summary"),
    confidence: mysqlEnum("confidence", ["low", "medium", "high"]).notNull(),
    // manual = ผู้ดูแลกดเอง, news = มีข่าวพูดถึง, stale = ข้อมูลเก่า, monthly = รอบคู่มือรายเดือน
    trigger: mysqlEnum("trigger", ["manual", "news", "stale", "monthly"]).notNull(),
    triggerRef: varchar("trigger_ref", { length: 320 }),
    status: mysqlEnum("status", SUGGESTION_STATUSES).notNull().default("pending"),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
    decidedBy: varchar("decided_by", { length: 320 }),
    decidedAt: datetime("decided_at", { mode: "date", fsp: 3 }),
    decisionNote: text("decision_note"),
  },
  (t) => [index("idx_suggestions_status").on(t.status, t.createdAt), index("idx_suggestions_target").on(t.targetType, t.targetKey)],
);

export interface SuggestedChange {
  field: string;
  before: unknown;
  after: unknown;
  /** หน้าที่ AI อ่านแล้วเจอหลักฐาน (null = ไม่ต้องมีหลักฐาน เช่นยืนยันว่าข้อมูลยังถูกต้อง) */
  evidenceUrl: string | null;
  /** ข้อความที่ยกมาตรงตัวจากหน้านั้น — ระบบตรวจแล้วว่ามีอยู่จริง */
  quote: string | null;
  reason: string;
}

/** หน้าทางการของผู้ให้บริการที่ใช้ตรวจเครื่องมือแต่ละตัว (หน้าผลิตภัณฑ์ หน้าราคา หน้าประกาศอัปเดต) */
export const watchPages = mysqlTable(
  "watch_pages",
  {
    id: int("id").autoincrement().primaryKey(),
    toolId: int("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 500 }).notNull(),
    // sha256 ของเนื้อหาครั้งล่าสุด — ใช้ข้ามการเรียก AI เมื่อหน้าไม่เปลี่ยน (รอบตรวจอัตโนมัติ)
    lastHash: char("last_hash", { length: 64 }),
    lastCheckedAt: datetime("last_checked_at", { mode: "date", fsp: 3 }),
    // ok / unchanged / ข้อความ error เช่น "HTTP 403"
    lastStatus: varchar("last_status", { length: 200 }),
  },
  (t) => [uniqueIndex("uq_watch_pages_tool_url").on(t.toolId, t.url)],
);

export const checkRuns = mysqlTable("check_runs", {
  id: int("id").autoincrement().primaryKey(),
  triggeredBy: varchar("triggered_by", { length: 320 }).notNull(),
  // เช่น "tool:12"
  scope: varchar("scope", { length: 200 }).notNull(),
  startedAt: datetime("started_at", { mode: "date", fsp: 3 }).notNull(),
  finishedAt: datetime("finished_at", { mode: "date", fsp: 3 }),
  status: mysqlEnum("status", ["running", "ok", "failed"]).notNull(),
  message: text("message"),
});

// ---------------------------------------------------------------- การใช้ AI (หน้า /admin/ai-usage และงบรายเดือน)

export const AI_FEATURES = ["news", "tool_check", "guide_check"] as const;

/** 1 แถว = เรียก AI 1 ครั้ง (รวมครั้งที่ล้มเหลว) — ค่าใช้จ่ายคิดจาก token ตามตารางราคาใน src/lib/ai/pricing.ts ตอนบันทึก */
export const aiUsage = mysqlTable(
  "ai_usage",
  {
    id: int("id").autoincrement().primaryKey(),
    at: datetime("at", { mode: "date", fsp: 3 }).notNull(),
    feature: mysqlEnum("feature", AI_FEATURES).notNull(),
    provider: varchar("provider", { length: 20 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    inputTokens: int("input_tokens").notNull().default(0),
    outputTokens: int("output_tokens").notNull().default(0),
    // null = ไม่มีราคาของรุ่นนี้ในตาราง
    costUsd: decimal("cost_usd", { precision: 12, scale: 6, mode: "number" }),
    ok: boolean("ok").notNull(),
    error: varchar("error", { length: 500 }),
    // เช่น "tool:12", "guide:coding-tools", "batch 20 ข่าว"
    ref: varchar("ref", { length: 200 }),
  },
  (t) => [index("idx_ai_usage_at").on(t.at)],
);
