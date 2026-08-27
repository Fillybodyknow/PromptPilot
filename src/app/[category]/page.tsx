import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory, getCategoryEntries, getCategoryGuide } from "@/lib/data";
import { ToolCards } from "@/components/ToolCards";
import { CategoryGuideSection } from "@/components/CategoryGuideSection";
import { AuroraBackground } from "@/components/AuroraBackground";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.key }));
}

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categoryKey } = await params;
  const category = getCategory(categoryKey);
  if (!category) notFound();

  const entries = getCategoryEntries<Record<string, unknown>>(categoryKey);
  const guide = getCategoryGuide(categoryKey);

  return (
    <>
      <section className="relative overflow-hidden">
        <AuroraBackground />
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-6 sm:pt-16">
          <Link
            href="/explore"
            className="animate-fade-up inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-indigo-400"
          >
            ← กลับหน้าหมวดหมู่
          </Link>

          <header className="mt-4">
            <h1
              className="animate-fade-up text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl"
              style={{ animationDelay: "80ms" }}
            >
              {category.titleTh}
            </h1>
            <p
              className="animate-fade-up mt-2 max-w-2xl text-neutral-400"
              style={{ animationDelay: "140ms" }}
            >
              {category.descriptionTh}
            </p>
          </header>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-16 sm:pb-20">
        {guide ? (
          <CategoryGuideSection guide={guide} />
        ) : (
          <p className="mb-8 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-500">
            หมวดนี้ยังไม่มีคู่มือ &ldquo;วิธีใช้งาน / เขียน prompt / ติดตั้ง&rdquo; —
            ดูรายชื่อเครื่องมือด้านล่างได้ก่อน
          </p>
        )}

        <h2 className="mb-4 text-lg font-medium text-neutral-100">เครื่องมือแนะนำ</h2>
        <ToolCards entries={entries} columns={category.columns} />
      </main>
    </>
  );
}
