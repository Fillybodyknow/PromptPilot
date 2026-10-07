import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { publisherOf } from "@/lib/news/publisher";
import { ExternalIcon } from "@/components/site/icons";
import { Breadcrumb, ToolStatusBadge, card } from "@/components/site/ui";
import { VendorLogo } from "@/components/VendorLogo";
import { getCategory } from "@/lib/categories";
import { getCategoryEntries } from "@/lib/data";
import { formatIsoDate, formatNewsTime } from "@/lib/format";
import { ACCESS_LABEL_LONG } from "@/lib/labels";
import { listApprovedNews } from "@/lib/news/public";
import { one, type SearchParams } from "@/lib/params";
import type { BaseEntry } from "@/lib/schema";

type Props = { params: Promise<{ category: string; id: string }>; searchParams: Promise<SearchParams> };

const VIEWS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "employee", label: "พนักงาน" },
  { key: "it", label: "ฝ่าย IT" },
  { key: "exec", label: "ผู้บริหาร" },
] as const;

async function load(categoryKey: string, id: string) {
  const category = getCategory(categoryKey);
  if (!category) return null;
  const entries = await getCategoryEntries<BaseEntry & Record<string, unknown>>(categoryKey);
  const tool = entries.find((e) => e.id === id);
  return tool ? { category, entries, tool } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, id } = await params;
  const data = await load(category, id);
  return data ? { title: data.tool.name, description: data.tool.bestFor } : { title: "ไม่พบเครื่องมือ" };
}

export default async function ToolPage({ params, searchParams }: Props) {
  await connection();
  const [{ category: key, id }, sp] = await Promise.all([params, searchParams]);
  const rawView = one(sp.view);
  const data = await load(key, id);
  if (!data) notFound();
  const { category, entries, tool } = data;
  const view = VIEWS.some((v) => v.key === rawView) ? rawView! : "all";
  const show = (v: string) => view === "all" || view === v;
  const news = await listApprovedNews({ categories: [key], pageSize: 4 });
  const extras = category.columns.filter((c) => typeof tool[c.key] === "string" && tool[c.key]);
  const tokenPrice =
    tool.priceUsdIn !== null || tool.priceUsdOut !== null
      ? `$${tool.priceUsdIn ?? "-"} / $${tool.priceUsdOut ?? "-"} ต่อ 1M token (input / output)`
      : null;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-7 sm:px-6">
      <Breadcrumb items={[{ label: "เครื่องมือ", href: "/tools" }, { label: category.titleTh, href: `/guides/${key}` }, { label: tool.name }]} />

      <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <VendorLogo vendor={tool.vendor} size={64} className="rounded-2xl" />
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{tool.name}</h1>
            <p className="mt-1.5 text-[15px] text-muted">
              {tool.vendor}
              {tool.modelId && ` · ${tool.modelId}`} · ข้อมูลจากแหล่ง{tool.sourceLabel === "official" ? " Official" : "ชุมชน"}
            </p>
          </div>
        </div>
        <a href={tool.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-5 font-semibold text-background">
          ไปที่เว็บไซต์ <ExternalIcon size={16} />
        </a>
      </div>

      <dl className="mt-6 flex flex-wrap gap-3">
        <div className={`${card} flex-[1_1_200px] p-4`}>
          <dt className="text-[13px] text-muted">สถานะ</dt>
          <dd className="mt-1">
            <ToolStatusBadge status={tool.status} />
          </dd>
        </div>
        <div className={`${card} flex-[1_1_200px] p-4`}>
          <dt className="text-[13px] text-muted">เข้าถึงผ่าน</dt>
          <dd className="mt-1 font-semibold">{ACCESS_LABEL_LONG[tool.accessMethod] ?? tool.accessMethod}</dd>
        </div>
        <div className={`${card} flex-[1_1_200px] p-4`}>
          <dt className="text-[13px] text-muted">ตรวจข้อมูลล่าสุด</dt>
          <dd className="mt-1 font-semibold">{formatIsoDate(tool.verifiedAt)}</dd>
        </div>
      </dl>

      {tool.warning && (
        <p className="mt-4 rounded-xl bg-warn-bg px-4 py-3 leading-relaxed">
          <strong className="text-warn">ข้อควรรู้:</strong> {tool.warning}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-8">
        <div className="min-w-0 flex-[999_1_640px]">
          <nav aria-label="อ่านในมุมของ" className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm text-muted">อ่านในมุมของ</span>
            {VIEWS.map((v) => (
              <Link
                key={v.key}
                href={v.key === "all" ? `/tools/${key}/${id}` : `/tools/${key}/${id}?view=${v.key}`}
                scroll={false}
                aria-current={v.key === view ? "true" : undefined}
                className={`flex h-10 items-center rounded-full border px-3.5 text-sm ${
                  v.key === view ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface hover:border-ink"
                }`}
              >
                {v.label}
              </Link>
            ))}
          </nav>

          {show("employee") && (
            <section className={`${card} mt-4 p-6`}>
              <h2 className="text-[13px] font-bold text-brand">สำหรับพนักงาน: ใช้ทำอะไรได้ดี</h2>
              <p className="mt-2.5 text-[17px] font-semibold leading-relaxed">{tool.bestFor}</p>
              <p className="mt-2 leading-[1.8] text-muted">{tool.summary}</p>
              <Link href={`/guides/${key}?tab=prompts`} className="mt-3.5 inline-block font-semibold text-brand hover:underline">
                ดู prompt ตัวอย่างของหมวด{category.titleTh} →
              </Link>
            </section>
          )}

          {show("it") && (
            <section className={`${card} mt-4 p-6`}>
              <h2 className="text-[13px] font-bold text-brand">สำหรับ IT: ติดตั้งและตั้งค่า</h2>
              {tool.installSteps.length > 0 ? (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed">
                  {tool.installSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-muted">{ACCESS_LABEL_LONG[tool.accessMethod]}</p>
              )}
              {extras.map((c) => (
                <p key={c.key} className="mt-3 leading-relaxed">
                  <strong className="font-semibold">{c.labelTh}:</strong> {String(tool[c.key])}
                </p>
              ))}
            </section>
          )}

          {show("exec") && (
            <section className={`${card} mt-4 p-6`}>
              <h2 className="text-[13px] font-bold text-brand">สำหรับผู้บริหาร: ต้นทุนและการตัดสินใจ</h2>
              <p className="mt-2.5 leading-[1.8]">{tool.priceNote}</p>
              {tokenPrice && <p className="mt-2 text-sm text-muted">ราคา API: {tokenPrice}</p>}
              {tool.benchmark && (
                <p className="mt-2 leading-relaxed text-muted">
                  <strong className="font-semibold text-ink">ผลทดสอบ:</strong> {tool.benchmark}
                </p>
              )}
              {tool.sourceUrl && (
                <p className="mt-2 text-sm text-muted">
                  แหล่งอ้างอิง:{" "}
                  <a href={tool.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {new URL(tool.sourceUrl).hostname}
                  </a>
                </p>
              )}
            </section>
          )}

          {entries.length > 1 && (
            <section className="mt-9" aria-labelledby="compare">
              <h2 id="compare" className="text-xl font-bold">
                เทียบกับเครื่องมืออื่นในหมวดนี้
              </h2>
              <div className={`${card} mt-3 overflow-x-auto`}>
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="px-4 py-3.5 font-semibold">เครื่องมือ</th>
                      <th className="px-4 py-3.5 font-semibold">เหมาะกับ</th>
                      <th className="px-4 py-3.5 font-semibold">ราคา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className={`border-t border-line align-top ${e.id === tool.id ? "bg-brand-soft" : ""}`}>
                        <td className="px-4 py-3.5">
                          {e.id === tool.id ? (
                            <span className="font-bold">{e.name} (หน้านี้)</span>
                          ) : (
                            <Link href={`/tools/${key}/${e.id}`} className="font-semibold text-brand hover:underline">
                              {e.name}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3.5 leading-relaxed">{e.bestFor}</td>
                        <td className="px-4 py-3.5 leading-relaxed">
                          <span className="line-clamp-2">{e.priceNote}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside aria-label="ข่าวล่าสุดของหมวดนี้" className="min-w-0 flex-[1_1_280px]">
          <section className={`${card} p-5`}>
            <h2 className="font-bold">ข่าวล่าสุดในหมวด{category.titleTh}</h2>
            {news.items.length === 0 ? (
              <p className="mt-3 text-sm text-muted">ยังไม่มีข่าวในหมวดนี้</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3.5">
                {news.items.map((n) => (
                  <li key={n.id}>
                    <Link href={`/news/${n.id}`} className="font-semibold leading-snug hover:text-brand">
                      {n.titleTh ?? n.title}
                    </Link>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {publisherOf(n)} · {formatNewsTime(n.publishedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/guides/${key}?tab=news`} className="mt-3.5 inline-block text-sm font-semibold text-brand hover:underline">
              ข่าวทั้งหมดในหมวดนี้ →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
