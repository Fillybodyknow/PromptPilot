/**
 * Per-group color accents so each work-category group (งานเอกสาร, งานออกแบบ, ...)
 * reads as its own hue across the sidebar, category headers, and tool cards — instead
 * of everything sharing the same indigo/violet/fuchsia brand accent.
 *
 * Class strings are written out in full (never composed via `${color}-400` template
 * literals) because Tailwind's scanner matches literal text in source files — an
 * interpolated class name would never be generated. Each field also carries a
 * `light:` variant — the -300/-400 text shades read fine on the dark background but
 * are too low-contrast on a white one, so light mode swaps to a -600/-700 shade.
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
    badge:
      "border-indigo-400/30 bg-indigo-500/10 text-indigo-300 light:border-indigo-500/30 light:text-indigo-700",
    solid: "bg-indigo-500 text-white",
    active:
      "border-indigo-400 bg-indigo-500/10 text-indigo-300 light:border-indigo-500 light:text-indigo-700",
    count: "text-indigo-400 light:text-indigo-600",
    hoverBorder: "hover:border-indigo-400/30 light:hover:border-indigo-500/40",
    hoverText:
      "hover:text-indigo-400 hover:decoration-indigo-400 light:hover:text-indigo-600 light:hover:decoration-indigo-600",
  },
  งานเอกสาร: {
    icon: "📄",
    badge:
      "border-sky-400/30 bg-sky-500/10 text-sky-300 light:border-sky-500/30 light:text-sky-700",
    solid: "bg-sky-500 text-white",
    active:
      "border-sky-400 bg-sky-500/10 text-sky-300 light:border-sky-500 light:text-sky-700",
    count: "text-sky-400 light:text-sky-600",
    hoverBorder: "hover:border-sky-400/30 light:hover:border-sky-500/40",
    hoverText:
      "hover:text-sky-400 hover:decoration-sky-400 light:hover:text-sky-600 light:hover:decoration-sky-600",
  },
  งานพัฒนาระบบ: {
    icon: "💻",
    badge:
      "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 light:border-emerald-500/30 light:text-emerald-700",
    solid: "bg-emerald-500 text-white",
    active:
      "border-emerald-400 bg-emerald-500/10 text-emerald-300 light:border-emerald-500 light:text-emerald-700",
    count: "text-emerald-400 light:text-emerald-600",
    hoverBorder: "hover:border-emerald-400/30 light:hover:border-emerald-500/40",
    hoverText:
      "hover:text-emerald-400 hover:decoration-emerald-400 light:hover:text-emerald-600 light:hover:decoration-emerald-600",
  },
  งานข้อมูล: {
    icon: "📊",
    badge:
      "border-cyan-400/30 bg-cyan-500/10 text-cyan-300 light:border-cyan-500/30 light:text-cyan-700",
    solid: "bg-cyan-500 text-white",
    active:
      "border-cyan-400 bg-cyan-500/10 text-cyan-300 light:border-cyan-500 light:text-cyan-700",
    count: "text-cyan-400 light:text-cyan-600",
    hoverBorder: "hover:border-cyan-400/30 light:hover:border-cyan-500/40",
    hoverText:
      "hover:text-cyan-400 hover:decoration-cyan-400 light:hover:text-cyan-600 light:hover:decoration-cyan-600",
  },
  งานออกแบบ: {
    icon: "🎨",
    badge:
      "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300 light:border-fuchsia-500/30 light:text-fuchsia-700",
    solid: "bg-fuchsia-500 text-white",
    active:
      "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-300 light:border-fuchsia-500 light:text-fuchsia-700",
    count: "text-fuchsia-400 light:text-fuchsia-600",
    hoverBorder: "hover:border-fuchsia-400/30 light:hover:border-fuchsia-500/40",
    hoverText:
      "hover:text-fuchsia-400 hover:decoration-fuchsia-400 light:hover:text-fuchsia-600 light:hover:decoration-fuchsia-600",
  },
  งานสื่อสาร: {
    icon: "🎙️",
    badge:
      "border-rose-400/30 bg-rose-500/10 text-rose-300 light:border-rose-500/30 light:text-rose-700",
    solid: "bg-rose-500 text-white",
    active:
      "border-rose-400 bg-rose-500/10 text-rose-300 light:border-rose-500 light:text-rose-700",
    count: "text-rose-400 light:text-rose-600",
    hoverBorder: "hover:border-rose-400/30 light:hover:border-rose-500/40",
    hoverText:
      "hover:text-rose-400 hover:decoration-rose-400 light:hover:text-rose-600 light:hover:decoration-rose-600",
  },
  งานระบบ: {
    icon: "⚙️",
    badge:
      "border-amber-400/30 bg-amber-500/10 text-amber-300 light:border-amber-500/30 light:text-amber-700",
    solid: "bg-amber-500 text-white",
    active:
      "border-amber-400 bg-amber-500/10 text-amber-300 light:border-amber-500 light:text-amber-700",
    count: "text-amber-400 light:text-amber-600",
    hoverBorder: "hover:border-amber-400/30 light:hover:border-amber-500/40",
    hoverText:
      "hover:text-amber-400 hover:decoration-amber-400 light:hover:text-amber-600 light:hover:decoration-amber-600",
  },
};

export const DEFAULT_GROUP_ACCENT = GROUP_ACCENTS["ผู้ช่วยทั่วไป"];

export function getGroupAccent(group: string): GroupAccent {
  return GROUP_ACCENTS[group] ?? DEFAULT_GROUP_ACCENT;
}
