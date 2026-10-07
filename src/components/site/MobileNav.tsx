"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { MainNav } from "./MainNav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    // Escape ปิดเมนู และ Tab วนอยู่ในเมนู (aria-modal ไม่ได้กันโฟกัสหลุดไปข้างหลังเอง)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button, input");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-chip"
      >
        <MenuIcon size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="เมนู"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 right-0 flex w-[300px] max-w-[85vw] flex-col bg-surface shadow-2xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-line pl-5 pr-2">
              <span className="font-semibold">เมนู</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิดเมนู"
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-chip"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <form action={withBasePath("/search")} role="search" className="border-b border-line p-3">
              <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-background px-3 text-muted">
                <SearchIcon />
                <input
                  type="search"
                  name="q"
                  placeholder="ค้นหาข่าว เครื่องมือ หรือคู่มือ"
                  aria-label="ค้นหา"
                  className="w-full bg-transparent text-sm text-ink outline-none"
                />
              </label>
            </form>
            <div className="p-3">
              <MainNav vertical onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
