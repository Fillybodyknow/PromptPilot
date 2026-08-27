import type { ColumnDef } from "@/lib/categories";
import { VendorLogo } from "./VendorLogo";

interface ToolCardsProps {
  entries: Record<string, unknown>[];
  columns: ColumnDef[];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "✅ รองรับ" : "—";
  if (typeof value === "number") return value.toLocaleString("th-TH");
  return String(value);
}

const STATUS_LABEL: Record<string, string> = {
  active: "เปิดใช้",
  closing: "กำลังปิด",
  closed: "ปิดแล้ว",
  restricted: "ถูกจำกัด",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-950/40 text-emerald-300 ring-emerald-800",
  closing: "bg-amber-950/40 text-amber-300 ring-amber-800",
  closed: "bg-red-950/40 text-red-300 ring-red-800",
  restricted: "bg-amber-950/40 text-amber-300 ring-amber-800",
};

const ACCESS_METHOD_LABEL: Record<string, string> = {
  web: "ใช้ผ่านเว็บ ไม่ต้องติดตั้ง",
  "browser-extension": "Browser Extension",
  "desktop-installer": "ติดตั้งโปรแกรมบนเครื่อง",
  cli: "เครื่องมือบรรทัดคำสั่ง (CLI)",
  "self-hosted": "ต้องมี IT รันเซิร์ฟเวอร์เอง",
  "sso-license": "ต้องขอ license ผ่าน SSO องค์กร",
};

export function ToolCards({ entries, columns }: ToolCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, i) => {
        const status = String(entry.status ?? "active");
        const sourceLabel = entry.sourceLabel === "official" ? "Official" : "Community";
        return (
          <div
            key={String(entry.id)}
            className="animate-fade-up group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.06]"
            style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <VendorLogo vendor={String(entry.vendor)} size={32} />
                <div>
                  <h3 className="font-medium text-neutral-100">
                    {typeof entry.url === "string" && entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-neutral-600 underline-offset-2 hover:text-indigo-400 hover:decoration-indigo-400"
                      >
                        {String(entry.name)} ↗
                      </a>
                    ) : (
                      String(entry.name)
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500">{String(entry.vendor)}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[status] ?? STATUS_STYLE.active}`}
              >
                {STATUS_LABEL[status] ?? status}
              </span>
            </div>

            <span className="mt-3 inline-flex w-fit rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-700 text-neutral-400">
              {sourceLabel}
            </span>

            {entry.summary ? (
              <p className="mt-2 text-sm text-neutral-400">{String(entry.summary)}</p>
            ) : null}

            {columns.length > 0 ? (
              <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3 text-sm">
                {columns.map((col) => (
                  <div key={col.key}>
                    <dt className="text-xs text-neutral-500">{col.labelTh}</dt>
                    <dd className="text-neutral-300">{formatCell(entry[col.key])}</dd>
                  </div>
                ))}
              </div>
            ) : null}

            {Array.isArray(entry.installSteps) && entry.installSteps.length > 0 ? (
              <details className="mt-4 border-t border-white/10 pt-3">
                <summary className="cursor-pointer text-xs font-medium text-neutral-400 hover:text-neutral-200">
                  📦 วิธีเข้าถึง/ติดตั้ง
                </summary>
                <div className="mt-2 rounded border border-white/10 bg-black/40 p-2">
                  {typeof entry.accessMethod === "string" ? (
                    <span className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-700 text-neutral-400">
                      {ACCESS_METHOD_LABEL[entry.accessMethod] ?? entry.accessMethod}
                    </span>
                  ) : null}
                  <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-neutral-400">
                    {(entry.installSteps as string[]).map((step, si) => (
                      <li key={si}>{step}</li>
                    ))}
                  </ol>
                </div>
              </details>
            ) : null}

            <p className="mt-auto pt-3 text-xs text-neutral-600">
              Verify: {String(entry.verifiedAt)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
