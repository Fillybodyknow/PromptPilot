import Link from "next/link";

/** ลิงก์แบ่งหน้าที่คงค่าตัวกรองอื่นใน URL ไว้ */
export function Pagination({ basePath, params, page, totalPages }: { basePath: string; params: Record<string, string | undefined>; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams(Object.entries({ ...params, page: p > 1 ? String(p) : undefined }).filter((e): e is [string, string] => !!e[1]));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);
  const cls = "flex h-11 min-w-11 items-center justify-center rounded-lg border px-3";
  return (
    <nav aria-label="แบ่งหน้า" className="mt-7 flex flex-wrap justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className={`${cls} border-line bg-surface`}>
          ← ก่อนหน้า
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="flex h-11 items-center px-1 text-muted">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${cls} ${p === page ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className={`${cls} border-line bg-surface`}>
          ถัดไป →
        </Link>
      )}
    </nav>
  );
}
