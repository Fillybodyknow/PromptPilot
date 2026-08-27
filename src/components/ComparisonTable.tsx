import type { ColumnDef } from "@/lib/categories";
import { VendorLogo } from "./VendorLogo";

interface ComparisonTableProps {
  entries: Record<string, unknown>[];
  columns: ColumnDef[];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "✅" : "—";
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
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
  closing:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
  closed:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800",
  restricted:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
};

const ACCESS_METHOD_LABEL: Record<string, string> = {
  web: "ใช้ผ่านเว็บ ไม่ต้องติดตั้ง",
  "browser-extension": "Browser Extension",
  "desktop-installer": "ติดตั้งโปรแกรมบนเครื่อง",
  cli: "เครื่องมือบรรทัดคำสั่ง (CLI)",
  "self-hosted": "ต้องมี IT รันเซิร์ฟเวอร์เอง",
  "sso-license": "ต้องขอ license ผ่าน SSO องค์กร",
};

export function ComparisonTable({ entries, columns }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <th className="px-4 py-3 font-medium">ชื่อ</th>
            <th className="px-4 py-3 font-medium">ผู้พัฒนา</th>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.labelTh}
              </th>
            ))}
            <th className="px-4 py-3 font-medium">สถานะ</th>
            <th className="px-4 py-3 font-medium">Verify date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const status = String(entry.status ?? "active");
            const sourceLabel = entry.sourceLabel === "official" ? "Official" : "Community";
            return (
              <tr
                key={String(entry.id)}
                className="border-t border-neutral-200 align-top dark:border-neutral-800"
              >
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  <div>
                    {typeof entry.url === "string" && entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-neutral-300 underline-offset-2 hover:text-indigo-600 hover:decoration-indigo-400 dark:decoration-neutral-600 dark:hover:text-indigo-400"
                      >
                        {String(entry.name)} ↗
                      </a>
                    ) : (
                      String(entry.name)
                    )}
                  </div>
                  <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-200 text-neutral-500 dark:ring-neutral-700 dark:text-neutral-400">
                    {sourceLabel}
                  </span>
                  {entry.summary ? (
                    <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-500">
                      {String(entry.summary)}
                    </p>
                  ) : null}
                  {Array.isArray(entry.installSteps) && entry.installSteps.length > 0 ? (
                    <details className="mt-2 max-w-xs">
                      <summary className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200">
                        📦 วิธีเข้าถึง/ติดตั้ง
                      </summary>
                      <div className="mt-1.5 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950/60">
                        {typeof entry.accessMethod === "string" ? (
                          <span className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-200 text-neutral-500 dark:ring-neutral-700 dark:text-neutral-400">
                            {ACCESS_METHOD_LABEL[entry.accessMethod] ?? entry.accessMethod}
                          </span>
                        ) : null}
                        <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                          {(entry.installSteps as string[]).map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <VendorLogo vendor={String(entry.vendor)} size={22} />
                    <span>{String(entry.vendor)}</span>
                  </div>
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {formatCell(entry[col.key])}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ring-1 ring-inset ${
                      STATUS_STYLE[status] ?? STATUS_STYLE.active
                    }`}
                  >
                    {STATUS_LABEL[status] ?? status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400 dark:text-neutral-500">
                  {String(entry.verifiedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
