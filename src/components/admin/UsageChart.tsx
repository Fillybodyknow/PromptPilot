"use client";

import { useState } from "react";

export interface UsageDay {
  /** YYYY-MM-DD */
  day: string;
  /** ค่าใช้จ่ายเป็นบาทของแต่ละงาน ตามลำดับเดียวกับ series */
  values: number[];
}

/**
 * กราฟแท่งซ้อนค่าใช้จ่าย AI รายวัน (บาท) แยกสีตามงาน — ชี้ที่วันไหนเห็นตัวเลขของวันนั้น
 * สีเป็น categorical 3 สีแรกของชุดสีที่ตรวจผ่าน CVD แล้ว (กำหนดใน .usage-chart ของ globals.css ทั้งสองธีม)
 */
export function UsageChart({ days, series }: { days: UsageDay[]; series: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((d) => d.values.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 0);
  // เพดานแกนเป็นตัวเลขกลมๆ ให้เส้นกริดอ่านง่าย
  const step = niceStep(max / 4);
  const top = Math.max(step * 4, step);
  const W = 720;
  const H = 220;
  const padL = 44;
  const padB = 24;
  const plotW = W - padL - 8;
  const plotH = H - padB - 8;
  const slot = plotW / Math.max(days.length, 1);
  const barW = Math.max(4, Math.min(22, slot - 4));
  const y = (v: number) => 8 + plotH - (v / top) * plotH;
  const fmt = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(2));
  const h = hover !== null ? days[hover] : null;

  return (
    <div className="usage-chart relative">
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted" aria-label="คำอธิบายสี">
        {series.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(--series-${i + 1})` }} />
            {s}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="ค่าใช้จ่าย AI รายวัน (บาท) — ตัวเลขทั้งหมดอยู่ในตารางด้านล่าง" onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={padL} x2={W - 8} y1={y(step * i)} y2={y(step * i)} stroke="var(--line)" strokeWidth={1} />
            <text x={padL - 6} y={y(step * i) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
              {fmt(step * i)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          let acc = 0;
          const segs = d.values
            .map((v, s) => ({ v, s }))
            .filter((p) => p.v > 0)
            .map((p) => {
              const y0 = y(acc);
              acc += p.v;
              return { ...p, y0, y1: y(acc) };
            });
          return (
            <g key={d.day} opacity={hover === null || hover === i ? 1 : 0.45}>
              {segs.map((p, k) => {
                const isTop = k === segs.length - 1;
                // ช่องว่าง 2px สีพื้นระหว่างชั้น; ปลายบนสุดโค้ง 4px
                const hgt = Math.max(0, p.y0 - p.y1 - (k > 0 ? 2 : 0));
                return isTop ? (
                  <path key={p.s} d={roundedTop(x, p.y1, barW, hgt, Math.min(4, hgt, barW / 2))} fill={`var(--series-${p.s + 1})`} />
                ) : (
                  <rect key={p.s} x={x} y={p.y1} width={barW} height={hgt} fill={`var(--series-${p.s + 1})`} />
                );
              })}
              {(i === 0 || i === days.length - 1 || (days.length > 10 && (i + 1) % 5 === 0)) && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {Number(d.day.slice(8))}
                </text>
              )}
              {/* พื้นที่ชี้กว้างกว่าแท่ง */}
              <rect x={padL + i * slot} y={8} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-44 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] shadow-lg"
          style={{ left: `clamp(0px, calc(${((padL + hover * slot + slot / 2) / W) * 100}% - 88px), calc(100% - 180px))` }}
        >
          <p className="font-semibold">
            {new Date(`${h.day}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" })} · {totals[hover].toFixed(2)} บาท
          </p>
          {series.map((s, i) => (
            <p key={s} className="flex items-center justify-between gap-3 text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: `var(--series-${i + 1})` }} />
                {s}
              </span>
              <span className="text-ink">{h.values[i].toFixed(2)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** สี่เหลี่ยมมุมบนโค้ง (ปลายข้อมูล) ฐานตรง */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
