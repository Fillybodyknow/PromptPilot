"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";

export type FormState = { ok: boolean; message: string; errors?: string[] } | null;

/**
 * ฟอร์มที่แสดงผล/ข้อผิดพลาดจาก server action ใต้ปุ่ม
 * ส่งผ่าน startTransition แทน <form action> เพราะแบบนั้น React ล้างค่าในฟอร์มทุกครั้งที่ส่ง
 * — ผู้ใช้ที่กรอกผิดจะเสียสิ่งที่พิมพ์ไว้ทั้งหมด
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "กำลังบันทึก…",
  className = "",
  variant = "primary",
  resetOnSuccess = false,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "neutral" | "danger";
  /** ฟอร์มเพิ่มรายการใหม่: ล้างค่าหลังบันทึกสำเร็จ กันกดซ้ำแล้วได้รายการซ้ำ */
  resetOnSuccess?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);
  const btn = {
    primary: "bg-ink text-background",
    neutral: "border border-line bg-surface text-ink hover:border-ink",
    danger: "bg-urgent text-background",
  }[variant];
  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`h-11 rounded-lg px-5 text-sm font-semibold disabled:opacity-60 ${btn}`}>
          {pending ? pendingLabel : submitLabel}
        </button>
        <div role="status" aria-live="polite" className="text-sm">
          {state && (
            <span className={state.ok ? "text-good" : "text-urgent"}>
              {state.message}
              {state.errors && state.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {state.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
