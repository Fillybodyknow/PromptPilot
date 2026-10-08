"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/(auth)/login/actions";

export interface HeaderUser {
  name: string;
  email: string;
  roleLabel: string;
  /** เข้าหน้า admin ได้ (ผู้ดูแลเนื้อหา/ผู้ดูแลระบบ) */
  staff: boolean;
  /** ผู้ดูแลระบบ — เห็นเมนูจัดการผู้ใช้ */
  admin: boolean;
  /** คำขอเข้าใช้งานที่รอผู้ดูแลระบบอนุมัติ (แสดงเฉพาะผู้ดูแลระบบ) */
  pending: number;
}

/** ตัวย่อชื่อสำหรับวงกลม avatar — ใช้ตัวแรกของสองคำแรก (รองรับชื่อไทย) */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.slice(0, 2).map((p) => [...p][0] ?? "");
  return chars.join("").toUpperCase() || "?";
}

export function Avatar({ name, className = "h-9 w-9 text-sm" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-bold text-white ${className}`}>
      {initials(name)}
    </span>
  );
}

/** ปุ่มเข้าหน้า admin บน top bar — เฉพาะผู้ดูแลเนื้อหา/ผู้ดูแลระบบ มีตัวเลขคำขอรออนุมัติสำหรับผู้ดูแลระบบ */
export function AdminButton({ user }: { user: HeaderUser }) {
  if (!user.staff) return null;
  return (
    <Link
      href={user.admin && user.pending > 0 ? "/admin/users" : "/admin"}
      className="hidden h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand lg:flex"
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
      Admin
      {user.admin && user.pending > 0 && (
        <span className="rounded-full bg-urgent px-1.5 py-0.5 text-[11px] font-bold leading-none text-background" aria-label={`${user.pending} คำขอรออนุมัติ`}>
          {user.pending}
        </span>
      )}
    </Link>
  );
}

/** badge ผู้ใช้บน top bar: วงกลมตัวย่อ + ชื่อ กดแล้วเปิดเมนู (อีเมล สิทธิ์ ลิงก์ admin ออกจากระบบ) */
export function UserMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-chip";
  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`บัญชีของ ${user.name}`}
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition hover:border-ink"
      >
        <span className="relative">
          <Avatar name={user.name} />
          {user.admin && user.pending > 0 && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-urgent" />}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold xl:inline">{user.name}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={menuId} className="fade-in absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar name={user.name} className="h-11 w-11 text-base" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{user.roleLabel}</span>
            </div>
          </div>
          <div className="border-t border-line pt-2">
            {user.staff && (
              <Link href="/admin" onClick={() => setOpen(false)} className={item}>
                หน้า Admin
              </Link>
            )}
            {user.admin && (
              <Link href="/admin/users" onClick={() => setOpen(false)} className={`${item} justify-between`}>
                จัดการผู้ใช้
                {user.pending > 0 && <span className="rounded-full bg-urgent px-2 py-0.5 text-[11px] font-bold text-background">{user.pending} รออนุมัติ</span>}
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className={`${item} w-full text-urgent`}>
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
