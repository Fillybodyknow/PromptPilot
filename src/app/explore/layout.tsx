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
      {/* Fixed full-viewport photo background for the whole /explore section — stays put
          as the page scrolls (Header's backdrop-blur picks up a frosted hint of it too).
          A strong scrim keeps the sidebar/cards on top legible. Only mounted while an
          /explore route is active, so it never bleeds into other pages. */}
      <div className="fixed inset-0 -z-10" aria-hidden>
        <HeroBackgroundSlideshow />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
        {/* Frosted glass panel — lets the fixed photo background show through blurred,
            same language as Header's backdrop-blur, while keeping content legible. */}
        <div className="rounded-3xl border border-white/10 bg-black/30 p-5 backdrop-blur-2xl sm:p-8">
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
      </div>
    </>
  );
}
