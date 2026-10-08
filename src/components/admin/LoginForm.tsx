"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "./ActionForm";

const input = "h-12 w-full rounded-xl border border-line bg-background px-4 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";

export function LoginForm({ action, next }: { action: (state: FormState, fd: FormData) => Promise<FormState>; next: string }) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        ชื่อผู้ใช้
        <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        รหัสผ่าน
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      <div role="status" aria-live="polite" className="min-h-5 text-sm text-urgent">
        {state && !state.ok && state.message}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
