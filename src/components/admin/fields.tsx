import type { ReactNode } from "react";

const input = "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-ink";

function Wrap({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "basis-full" : "min-w-0 flex-[1_1_260px]"}`}>
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextField({
  name,
  label,
  defaultValue,
  hint,
  type = "text",
  required,
  wide,
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <Wrap label={required ? `${label} *` : label} hint={hint} wide={wide}>
      <input name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} autoComplete={autoComplete} step={type === "number" ? "any" : undefined} className={`${input} h-11`} />
    </Wrap>
  );
}

export function TextArea({ name, label, defaultValue, hint, rows = 3, required }: { name: string; label: string; defaultValue?: string; hint?: string; rows?: number; required?: boolean }) {
  return (
    <Wrap label={required ? `${label} *` : label} hint={hint} wide>
      <textarea name={name} rows={rows} defaultValue={defaultValue} required={required} className={input} />
    </Wrap>
  );
}

export function SelectField({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string; options: { value: string; label: string }[] }) {
  return (
    <Wrap label={`${label} *`}>
      <select name={name} defaultValue={defaultValue} className={`${input} h-11`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-surface p-5">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      <div className="flex flex-wrap gap-4">{children}</div>
    </fieldset>
  );
}

/** ปุ่มเดี่ยวที่ส่ง id ไปกับ server action แบบไม่มีผลลัพธ์ให้แสดง (เรียงลำดับ เปิด/ปิด ลบ) */
export function IdButton({ action, id, label, className = "", ariaLabel }: { action: (fd: FormData) => Promise<void>; id: number | string; label: ReactNode; className?: string; ariaLabel?: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={ariaLabel} className={`flex h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-sm hover:border-ink ${className}`}>
        {label}
      </button>
    </form>
  );
}
