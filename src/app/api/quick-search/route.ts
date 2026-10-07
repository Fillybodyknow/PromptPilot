import { connection } from "next/server";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getToolIndex } from "@/lib/data";
import { formatNewsTime } from "@/lib/format";
import { listApprovedNews } from "@/lib/news/public";

export interface QuickItem {
  href: string;
  title: string;
  sub: string;
}

/** ข้อมูลสำหรับช่องค้นหาด่วน (Ctrl+K) — คู่มือ เครื่องมือ และข่าวที่อนุมัติล่าสุด กรองฝั่ง browser */
export async function GET() {
  await connection();
  const [tools, news] = await Promise.all([getToolIndex(), listApprovedNews({ pageSize: 30 })]);
  const body: Record<"guides" | "tools" | "news", QuickItem[]> = {
    guides: CATEGORIES.map((c) => ({ href: `/guides/${c.key}`, title: c.titleTh, sub: c.group })),
    // ชื่อเครื่องมือซ้ำกันได้ข้ามหมวด (เช่น Claude Opus 5 ทั้งในงานเขียนและงานโค้ด) จึงบอกหมวดด้วย
    tools: tools.map((t) => ({ href: `/tools/${t.categoryKey}/${t.slug}`, title: t.name, sub: `${t.vendor} · ${getCategory(t.categoryKey)?.titleTh ?? t.categoryKey}` })),
    news: news.items.map((n) => ({ href: `/news/${n.id}`, title: n.titleTh ?? n.title, sub: formatNewsTime(n.publishedAt) })),
  };
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=300" } });
}
