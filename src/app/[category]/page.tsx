import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory, getCategoryEntries, getCategoryGuide } from "@/lib/data";
import { ComparisonTable } from "@/components/ComparisonTable";
import { CategoryGuideSection } from "@/components/CategoryGuideSection";

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
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400"
      >
        ← กลับหน้าแรก
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">
          {category.titleTh}
        </h1>
        <p className="mt-1.5 text-neutral-600 dark:text-neutral-400">{category.descriptionTh}</p>
      </header>

      {guide ? (
        <CategoryGuideSection guide={guide} />
      ) : (
        <p className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-500">
          หมวดนี้ยังไม่มีคู่มือ &ldquo;วิธีใช้งาน / เขียน prompt / ติดตั้ง&rdquo; —
          ดูรายชื่อเครื่องมือด้านล่างได้ก่อน
        </p>
      )}

      <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-100">
        เครื่องมือแนะนำ
      </h2>
      <ComparisonTable entries={entries} columns={category.columns} />
    </main>
  );
}
