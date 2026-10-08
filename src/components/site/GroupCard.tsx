import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { groupVisual } from "@/lib/visuals";
import { GroupDot } from "./ui";

/** การ์ดกลุ่มงานแบบรูปเต็มใบ — ข้อความอยู่บน overlay สีเข้ม อ่านออกทั้งสองธีม */
export function GroupCard({ group, href, categories, toolCount, index = 0 }: { group: string; href: string; categories: string[]; toolCount: number; index?: number }) {
  const visual = groupVisual(group);
  return (
    <Link
      href={href}
      style={{ "--i": index } as CSSProperties}
      className="tilt reveal-pop group relative isolate flex min-h-52 min-w-0 flex-[1_1_260px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-white shadow-lg shadow-black/10"
    >
      <Image
        src={visual.src}
        alt=""
        fill
        placeholder="blur"
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
        className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/55 to-black/10" />
      <span className="flex items-center gap-2.5 text-lg font-bold">
        <GroupDot group={group} className="h-2.5 w-2.5 rounded-[3px] ring-2 ring-white/40" />
        {group}
      </span>
      <span className="mt-1 text-sm leading-relaxed text-white/85">{categories.join(" · ")}</span>
      <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/90">
        {toolCount} เครื่องมือ <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
