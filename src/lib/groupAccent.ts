/**
 * Per-group color accents so each work-category group (งานเอกสาร, งานออกแบบ, ...)
 * reads as its own hue across the sidebar, category headers, and tool cards — instead
 * of everything sharing the same indigo/violet/fuchsia brand accent.
 *
 * Class strings are written out in full (never composed via `${color}-400` template
 * literals) because Tailwind's scanner matches literal text in source files — an
 * interpolated class name would never be generated.
 */
export interface GroupAccent {
  icon: string;
  /** Eyebrow/pill badge, e.g. on the category detail header. */
  badge: string;
  /** Solid pill for the mobile sidebar's active chip. */
  solid: string;
  /** Sidebar active link (border-l-2 + bg + text). */
  active: string;
  /** Count number next to an active sidebar link. */
  count: string;
  /** Tool card hover border tint. */
  hoverBorder: string;
  /** Hover color for linked tool names inside cards. */
  hoverText: string;
}

export const GROUP_ACCENTS: Record<string, GroupAccent> = {
  ผู้ช่วยทั่วไป: {
    icon: "💬",
    badge: "border-indigo-400/30 bg-indigo-500/10 text-indigo-300",
    solid: "bg-indigo-500 text-white",
    active: "border-indigo-400 bg-indigo-500/10 text-indigo-300",
    count: "text-indigo-400",
    hoverBorder: "hover:border-indigo-400/30",
    hoverText: "hover:text-indigo-400 hover:decoration-indigo-400",
  },
  งานเอกสาร: {
    icon: "📄",
    badge: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    solid: "bg-sky-500 text-white",
    active: "border-sky-400 bg-sky-500/10 text-sky-300",
    count: "text-sky-400",
    hoverBorder: "hover:border-sky-400/30",
    hoverText: "hover:text-sky-400 hover:decoration-sky-400",
  },
  งานพัฒนาระบบ: {
    icon: "💻",
    badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    solid: "bg-emerald-500 text-white",
    active: "border-emerald-400 bg-emerald-500/10 text-emerald-300",
    count: "text-emerald-400",
    hoverBorder: "hover:border-emerald-400/30",
    hoverText: "hover:text-emerald-400 hover:decoration-emerald-400",
  },
  งานข้อมูล: {
    icon: "📊",
    badge: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
    solid: "bg-cyan-500 text-white",
    active: "border-cyan-400 bg-cyan-500/10 text-cyan-300",
    count: "text-cyan-400",
    hoverBorder: "hover:border-cyan-400/30",
    hoverText: "hover:text-cyan-400 hover:decoration-cyan-400",
  },
  งานออกแบบ: {
    icon: "🎨",
    badge: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300",
    solid: "bg-fuchsia-500 text-white",
    active: "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-300",
    count: "text-fuchsia-400",
    hoverBorder: "hover:border-fuchsia-400/30",
    hoverText: "hover:text-fuchsia-400 hover:decoration-fuchsia-400",
  },
  งานสื่อสาร: {
    icon: "🎙️",
    badge: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    solid: "bg-rose-500 text-white",
    active: "border-rose-400 bg-rose-500/10 text-rose-300",
    count: "text-rose-400",
    hoverBorder: "hover:border-rose-400/30",
    hoverText: "hover:text-rose-400 hover:decoration-rose-400",
  },
  งานระบบ: {
    icon: "⚙️",
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    solid: "bg-amber-500 text-white",
    active: "border-amber-400 bg-amber-500/10 text-amber-300",
    count: "text-amber-400",
    hoverBorder: "hover:border-amber-400/30",
    hoverText: "hover:text-amber-400 hover:decoration-amber-400",
  },
};

export const DEFAULT_GROUP_ACCENT = GROUP_ACCENTS["ผู้ช่วยทั่วไป"];

export function getGroupAccent(group: string): GroupAccent {
  return GROUP_ACCENTS[group] ?? DEFAULT_GROUP_ACCENT;
}
