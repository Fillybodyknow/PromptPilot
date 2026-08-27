import { getCategoriesGrouped } from "@/lib/data";
import { ExploreSidebar } from "@/components/ExploreSidebar";
import { HeroBackgroundSlideshow } from "@/components/HeroBackgroundSlideshow";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  // Strip down to plain serializable fields — CategoryMeta carries a Zod schema
  // object, which can't cross the server/client boundary as a prop.
  const groups = getCategoriesGrouped().map((g) => ({
    group: g.group,
    categories: g.categories.map((c) => ({ key: c.key, titleTh: c.titleTh })),
  }));

  return (
    <>
      {/* Decorative photo banner — lives in the layout (not the swapping content area)
          so it stays mounted and doesn't re-trigger as you switch categories. */}
      <section className="relative h-40 overflow-hidden sm:h-52" aria-hidden>
        <HeroBackgroundSlideshow />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#08070c]" />
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
        <div className="mb-6 lg:hidden">
          <ExploreSidebar groups={groups} variant="mobile" />
        </div>
        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24">
              <ExploreSidebar groups={groups} variant="sidebar" />
            </div>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
