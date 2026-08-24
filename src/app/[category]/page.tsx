import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory, getCategoryEntries } from "@/lib/data";
import { ComparisonTable } from "@/components/ComparisonTable";

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

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300">
        ← กลับหน้าแรก
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold text-neutral-100">{category.titleTh}</h1>
        <p className="mt-1 text-neutral-400">{category.descriptionTh}</p>
      </header>

      <ComparisonTable entries={entries} columns={category.columns} />
    </main>
  );
}
