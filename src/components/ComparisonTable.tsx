import type { ColumnDef } from "@/lib/categories";

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
  active: "bg-emerald-950/40 text-emerald-300 ring-emerald-800",
  closing: "bg-amber-950/40 text-amber-300 ring-amber-800",
  closed: "bg-red-950/40 text-red-300 ring-red-800",
  restricted: "bg-amber-950/40 text-amber-300 ring-amber-800",
};

export function ComparisonTable({ entries, columns }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-900 text-left text-neutral-400">
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
              <tr key={String(entry.id)} className="border-t border-neutral-800 align-top">
                <td className="px-4 py-3 font-medium text-neutral-100">
                  <div>
                    {typeof entry.url === "string" && entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-neutral-600 underline-offset-2 hover:text-white hover:decoration-neutral-400"
                      >
                        {String(entry.name)} ↗
                      </a>
                    ) : (
                      String(entry.name)
                    )}
                  </div>
                  <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-700 text-neutral-400">
                    {sourceLabel}
                  </span>
                  {entry.summary ? (
                    <p className="mt-1 max-w-xs text-xs text-neutral-500">
                      {String(entry.summary)}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-300">{String(entry.vendor)}</td>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-neutral-300">
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
                <td className="px-4 py-3 text-neutral-500">{String(entry.verifiedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
