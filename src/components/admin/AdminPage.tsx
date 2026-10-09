import Link from "next/link";
import type { ReactNode } from "react";

/** ปุ่มมาตรฐานของหน้า admin — ใช้ร่วมกันทุกหน้าให้หน้าตาและน้ำหนักเหมือนกัน */
export const btn = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-ink text-background hover:opacity-90`;
export const btnNeutral = `${btn} border border-line bg-surface text-ink hover:border-ink`;
export const btnDanger = `${btn} border border-urgent/40 text-urgent hover:bg-urgent-bg`;
export const inputCls = "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-ink";

/**
 * โครงหน้า admin: ลิงก์ย้อนกลับ (ถ้ามี) → หัวข้อ + คำอธิบายสั้น + ปุ่มหลักทางขวา → เนื้อหา
 * width: narrow สำหรับหน้าฟอร์มยาว (อ่านง่ายกว่าเต็มจอ), wide สำหรับตารางและรายการ
 */
export function AdminPage({
  title,
  description,
  actions,
  back,
  width = "wide",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <main className={`mx-auto w-full px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8 ${width === "narrow" ? "max-w-4xl" : "max-w-6xl"}`}>
      {back && (
        <Link href={back.href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-brand">
          ← {back.label}
        </Link>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <div className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="mt-6">{children}</div>
    </main>
  );
}

/** แท็บกรองสถานะ/หมวด พร้อมจำนวน — ลิงก์ธรรมดา (server render ตาม query string) */
export function FilterTabs({ label, items }: { label: string; items: { href: string; label: string; count?: number; active: boolean; alert?: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
            t.active ? "border-ink bg-ink font-semibold text-background" : "border-line bg-surface text-ink hover:border-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`rounded-full px-1.5 text-xs font-semibold ${
                t.active ? "bg-background/20" : t.alert && t.count > 0 ? "bg-warn-bg text-warn" : "bg-chip text-muted"
              }`}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** หัวข้อย่อยในหน้า พร้อมคำอธิบาย */
export function SectionTitle({ id, title, note }: { id?: string; title: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {note && <p className="mt-0.5 text-sm leading-relaxed text-muted">{note}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-muted">{children}</p>;
}
