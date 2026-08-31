"use client";

import { useState } from "react";
import type { ColumnDef } from "@/lib/categories";
import { VendorLogo } from "./VendorLogo";
import { DEFAULT_GROUP_ACCENT, type GroupAccent } from "@/lib/groupAccent";

interface ToolCardsProps {
  entries: Record<string, unknown>[];
  columns: ColumnDef[];
  /** Per-category-group color accent — ties the selected row/detail hue to its group. */
  accent?: GroupAccent;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "✅ รองรับ" : "—";
  if (typeof value === "number") return value.toLocaleString("th-TH");
  return String(value);
}

/** Install steps often embed a literal CLI command in backticks (e.g. self-hosted
 * models) — render those segments as inline <code> instead of plain text so they
 * stand out from the surrounding instruction instead of blurring together. */
function renderStepText(step: string) {
  return step.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code
        key={i}
        className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] break-all text-indigo-300 light:bg-black/10 light:text-indigo-700"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "เปิดใช้",
  preview: "พรีวิว/ทดลอง",
  "not-recommended-th": "ไม่แนะนำสำหรับงานภาษาไทย",
  closing: "กำลังปิด",
  closed: "ปิดแล้ว",
  restricted: "ถูกจำกัด",
};

const STATUS_STYLE: Record<string, string> = {
  active:
    "bg-emerald-950/40 text-emerald-300 ring-emerald-800 light:bg-emerald-50 light:text-emerald-700 light:ring-emerald-300",
  preview:
    "bg-sky-950/40 text-sky-300 ring-sky-800 light:bg-sky-50 light:text-sky-700 light:ring-sky-300",
  "not-recommended-th":
    "bg-rose-950/40 text-rose-300 ring-rose-800 light:bg-rose-50 light:text-rose-700 light:ring-rose-300",
  closing:
    "bg-amber-950/40 text-amber-300 ring-amber-800 light:bg-amber-50 light:text-amber-700 light:ring-amber-300",
  closed:
    "bg-red-950/40 text-red-300 ring-red-800 light:bg-red-50 light:text-red-700 light:ring-red-300",
  restricted:
    "bg-amber-950/40 text-amber-300 ring-amber-800 light:bg-amber-50 light:text-amber-700 light:ring-amber-300",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400",
  preview: "bg-sky-400",
  "not-recommended-th": "bg-rose-400",
  closing: "bg-amber-400",
  closed: "bg-red-400",
  restricted: "bg-amber-400",
};

const ACCESS_METHOD_LABEL: Record<string, string> = {
  web: "ใช้ผ่านเว็บ ไม่ต้องติดตั้ง",
  api: "เรียกผ่าน API",
  cli: "เครื่องมือบรรทัดคำสั่ง (CLI)",
  desktop: "ติดตั้งโปรแกรมบนเครื่อง",
  "self-host": "ต้องมี IT รันเซิร์ฟเวอร์เอง",
  "ide-extension": "ส่วนขยายใน IDE",
};

export function ToolCards({ entries, columns, accent = DEFAULT_GROUP_ACCENT }: ToolCardsProps) {
  const [selectedId, setSelectedId] = useState(entries[0] ? String(entries[0].id) : "");
  const selected = entries.find((e) => String(e.id) === selectedId) ?? entries[0];

  if (!selected) return null;

  const status = String(selected.status ?? "active");
  const sourceLabel = selected.sourceLabel === "official" ? "Official" : "Community";

  // benchmark/price/bestFor are now common fields on every entry (used to be
  // category-specific "columns") — folded into the same spec grid as whatever
  // genuinely category-specific columns this category still has (researchType,
  // outputType, thaiSupport, hardwareNote), instead of two separate-looking blocks.
  const priceParts: string[] = [];
  if (typeof selected.priceUsdIn === "number" && typeof selected.priceUsdOut === "number") {
    priceParts.push(
      `$${selected.priceUsdIn} / $${selected.priceUsdOut} ต่อ 1M token (input/output)`
    );
  }
  if (selected.priceNote) priceParts.push(String(selected.priceNote));

  const specs: { label: string; value: string }[] = [];
  if (selected.benchmark) specs.push({ label: "Benchmark", value: String(selected.benchmark) });
  if (priceParts.length) specs.push({ label: "ราคา", value: priceParts.join(" — ") });
  if (selected.bestFor) specs.push({ label: "เหมาะกับ", value: String(selected.bestFor) });
  for (const col of columns) {
    specs.push({ label: col.labelTh, value: formatCell(selected[col.key]) });
  }

  return (
    <div className="animate-fade-up flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Mobile: horizontal scroll strip of compact chips. */}
      <div className="lg:hidden">
        <p className="mb-2 text-xs font-medium text-neutral-500">
          👇 แตะเพื่อเลือกเครื่องมือ <span aria-hidden>·</span> เลื่อนดูเพิ่มเติม →
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {entries.map((entry) => {
            const id = String(entry.id);
            const isActive = id === selectedId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? accent.solid
                    : "bg-white/5 text-neutral-400 ring-1 ring-inset ring-white/15 hover:bg-white/10 hover:text-neutral-200 light:bg-black/5 light:text-neutral-500 light:ring-black/15 light:hover:bg-black/10 light:hover:text-neutral-900"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[String(entry.status ?? "active")] ?? STATUS_DOT.active}`}
                />
                {String(entry.name)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: vertical list, no per-item box — just a divider between rows. */}
      <div className="hidden shrink-0 lg:block lg:w-64">
        <div className="divide-y divide-white/10 light:divide-black/10">
          {entries.map((entry) => {
            const id = String(entry.id);
            const isActive = id === selectedId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className={`flex w-full items-center gap-2.5 border-l-2 py-2.5 pr-2 pl-3 text-left transition-all ${
                  isActive
                    ? accent.active
                    : "border-transparent text-neutral-400 hover:translate-x-0.5 hover:border-white/20 hover:bg-white/5 light:text-neutral-600 light:hover:border-black/20 light:hover:bg-black/5"
                }`}
              >
                <VendorLogo vendor={String(entry.vendor)} size={22} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${isActive ? "font-medium" : ""}`}
                  >
                    {String(entry.name)}
                  </span>
                  <span className="block truncate text-xs text-neutral-600 light:text-neutral-400">
                    {String(entry.vendor)}
                  </span>
                </span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[String(entry.status ?? "active")] ?? STATUS_DOT.active}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel — no outer box, just content with dividers between sections. */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <VendorLogo vendor={String(selected.vendor)} size={40} />
            <div>
              <h3 className="text-lg font-semibold text-neutral-100 light:text-neutral-900">
                {typeof selected.url === "string" && selected.url ? (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline decoration-neutral-600 underline-offset-2 ${accent.hoverText}`}
                  >
                    {String(selected.name)} ↗
                  </a>
                ) : (
                  String(selected.name)
                )}
              </h3>
              <p className="text-sm text-neutral-500">{String(selected.vendor)}</p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[status] ?? STATUS_STYLE.active}`}
          >
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <span className="mt-3 inline-flex w-fit rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-700 text-neutral-400 light:ring-neutral-300 light:text-neutral-600">
          {sourceLabel}
        </span>

        {selected.summary ? (
          <p className="mt-3 text-sm text-neutral-400 light:text-neutral-600">
            {String(selected.summary)}
          </p>
        ) : null}

        {selected.warning ? (
          <p className="mt-3 rounded border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300/90 light:border-amber-400/30 light:bg-amber-50 light:text-amber-700">
            ⚠️ {String(selected.warning)}
          </p>
        ) : null}

        {specs.length > 0 ? (
          <div className="mt-5 grid gap-3.5 border-t border-white/10 pt-4 text-sm sm:grid-cols-2 light:border-black/10">
            {specs.map((spec) => (
              <div key={spec.label}>
                <dt className="text-xs text-neutral-500">{spec.label}</dt>
                <dd className="text-neutral-300 light:text-neutral-700">{spec.value}</dd>
              </div>
            ))}
          </div>
        ) : null}

        {Array.isArray(selected.installSteps) && selected.installSteps.length > 0 ? (
          <div className="mt-5 border-t border-white/10 pt-4 light:border-black/10">
            <p className="mb-3 text-xs font-medium text-neutral-400 light:text-neutral-600">
              📦 วิธีเข้าถึง/ติดตั้ง
            </p>
            {typeof selected.accessMethod === "string" ? (
              <span className="mb-3 inline-block rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ring-neutral-700 text-neutral-400 light:ring-neutral-300 light:text-neutral-600">
                {ACCESS_METHOD_LABEL[selected.accessMethod] ?? selected.accessMethod}
              </span>
            ) : null}
            <ol className="space-y-3">
              {(selected.installSteps as string[]).map((step, si) => (
                <li key={si} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-neutral-300 light:bg-black/10 light:text-neutral-700">
                    {si + 1}
                  </span>
                  <span className="min-w-0 text-xs leading-relaxed text-neutral-400 light:text-neutral-600">
                    {renderStepText(step)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <p className="mt-5 border-t border-white/10 pt-3 text-xs text-neutral-600 light:border-black/10 light:text-neutral-400">
          Verify: {String(selected.verifiedAt)}
        </p>
      </div>
    </div>
  );
}
