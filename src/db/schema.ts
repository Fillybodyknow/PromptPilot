import {
  boolean,
  char,
  date,
  datetime,
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

export const USER_ROLES = ["admin", "editor"] as const;
export const USER_STATUSES = ["pending", "active", "rejected", "disabled"] as const;

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    // object ID ของผู้ใช้ใน Entra ID — ไม่เปลี่ยนตลอดอายุบัญชี ใช้ระบุตัวตนแทนอีเมล (อีเมลเปลี่ยน/ถูกนำไปใช้ซ้ำได้)
    msOid: varchar("ms_oid", { length: 64 }).notNull().unique("uq_users_ms_oid"),
    email: varchar("email", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    // บัญชี guest (B2B) ที่ถูกเชิญจากองค์กรอื่น — แสดงป้ายในหน้าอนุมัติ ให้ผู้ดูแลรู้ว่าไม่ใช่พนักงาน
    isGuest: boolean("is_guest").notNull().default(false),
    // admin = ผู้ดูแลระบบ (จัดการผู้ใช้ได้), editor = ผู้ดูแลเนื้อหา
    role: mysqlEnum("role", USER_ROLES).notNull().default("editor"),
    status: mysqlEnum("status", USER_STATUSES).notNull().default("pending"),
    requestedAt: datetime("requested_at", { mode: "date", fsp: 3 }).notNull(),
    decidedBy: varchar("decided_by", { length: 320 }),
    decidedAt: datetime("decided_at", { mode: "date", fsp: 3 }),
    lastLoginAt: datetime("last_login_at", { mode: "date", fsp: 3 }),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_users_status").on(t.status)],
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
