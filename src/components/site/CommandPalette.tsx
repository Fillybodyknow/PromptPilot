"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { QuickItem } from "@/app/api/quick-search/route";
import { withBasePath } from "@/lib/basePath";
import { SearchIcon } from "./icons";
import { NAV_ITEMS } from "./nav";

type Index = Record<"guides" | "tools" | "news", QuickItem[]>;
type Row = QuickItem & { group: string };

const PAGES: QuickItem[] = [{ href: "/", title: "หน้าแรก", sub: "" }, ...NAV_ITEMS.map((n) => ({ href: n.href, title: n.label, sub: "" }))];
const PER_GROUP = 6;

function isTyping(el: Element | null) {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement | null)?.isContentEditable;
}

/** ค้นหาด่วนทั้งเว็บ — เปิดด้วยปุ่มบน header, Ctrl/⌘+K หรือ / แล้วเลือกด้วยลูกศร + Enter */
export function CommandPalette() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setQ("");
    setActive(0);
    dialog.showModal();
    inputRef.current?.focus();
    if (!index) {
      fetch(withBasePath("/api/quick-search"))
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data: Index) => setIndex(data))
        .catch(() => setFailed(true));
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase();
    const match = (items: QuickItem[]) =>
      (needle ? items.filter((i) => i.title.toLowerCase().includes(needle) || i.sub.toLowerCase().includes(needle)) : items).slice(0, PER_GROUP);
    const groups: [string, QuickItem[]][] = needle
      ? [
          ["หน้า", match(PAGES)],
          ["คู่มือ", match(index?.guides ?? [])],
          ["เครื่องมือ", match(index?.tools ?? [])],
          ["ข่าว", match(index?.news ?? [])],
        ]
      : [
          ["หน้า", PAGES],
          ["ข่าวล่าสุด", (index?.news ?? []).slice(0, 5)],
        ];
    const out: Row[] = groups.flatMap(([group, items]) => items.map((i) => ({ ...i, group })));
    if (needle) out.push({ group: "ค้นหาทั้งหมด", href: `/search?q=${encodeURIComponent(q.trim())}`, title: `ค้นหา "${q.trim()}" ในข่าว เครื่องมือ และคู่มือ`, sub: "" });
    return out;
  }, [q, index]);

  function go(row: Row | undefined) {
    if (!row) return;
    dialogRef.current?.close();
    router.push(row.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % Math.max(rows.length, 1);
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(rows[active]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="ค้นหา (Ctrl+K)"
        className="hidden h-11 items-center gap-2 rounded-lg border border-line bg-background px-3 text-sm text-muted transition hover:border-brand/50 hover:text-ink lg:flex"
      >
        <SearchIcon />
        <span className="hidden w-36 text-left 2xl:inline">ค้นหา…</span>
        <kbd className="hidden whitespace-nowrap rounded border border-line bg-chip px-1.5 py-0.5 font-sans text-[11px] 2xl:inline">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="ค้นหาด่วน"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-0 mx-auto mt-[12vh] w-[min(640px,calc(100vw-32px))] max-w-none overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/40 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="พิมพ์ชื่อเครื่องมือ คู่มือ หรือข่าว"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line bg-chip px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="ผลการค้นหา" className="max-h-[60vh] overflow-y-auto p-2">
          {rows.map((r, i) => (
            <li key={`${r.group}-${r.href}`} role="presentation">
              {(i === 0 || rows[i - 1].group !== r.group) && (
                <div role="presentation" className="px-3 pb-1 pt-3 text-xs font-semibold text-muted">
                  {r.group}
                </div>
              )}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${i === active ? "bg-brand-soft text-brand" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                {r.sub && <span className="max-w-[45%] shrink-0 truncate text-xs text-muted">{r.sub}</span>}
                {i === active && <span aria-hidden>↵</span>}
              </div>
            </li>
          ))}
          {!index && !failed && <li className="px-3 py-3 text-sm text-muted">กำลังโหลด…</li>}
          {failed && <li className="px-3 py-3 text-sm text-muted">โหลดรายการไม่สำเร็จ กด Enter เพื่อค้นหาแบบเต็มแทน</li>}
        </ul>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
          <span>↑↓ เลือก</span>
          <span>Enter เปิด</span>
          <span>Esc ปิด</span>
          <span className="ml-auto">กด / หรือ Ctrl+K ได้ทุกหน้า</span>
        </div>
      </dialog>
    </>
  );
}
