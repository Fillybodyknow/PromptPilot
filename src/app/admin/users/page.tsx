import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { IdButton, TextField } from "@/components/admin/fields";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { listUsers } from "@/lib/auth/users";
import { addUser, changeMyPassword, removeUser, resetUserPassword, toggleUser } from "./actions";

export const metadata: Metadata = { title: "ผู้ใช้" };

const when = (d: Date | null) =>
  d ? d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "ยังไม่เคย";

const pwHint = `อย่างน้อย ${PASSWORD_MIN} ตัวอักษร`;

export default async function AdminUsersPage() {
  const me = await requireAdminPage();
  const users = await listUsers();
  const activeCount = users.filter((u) => u.isActive).length;
  const now = new Date();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold">ผู้ใช้</h1>
      <p className="mt-1 text-sm text-muted">
        ผู้ใช้ทุกคนแก้ไขได้ทุกส่วนของหน้า admin · เปิดใช้ {activeCount} จาก {users.length} บัญชี · login ครั้งหนึ่งอยู่ได้ 12 ชั่วโมง
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {users.map((u) => {
          const isMe = u.id === me.userId;
          const locked = u.lockedUntil && u.lockedUntil > now;
          const lastActive = u.isActive && activeCount <= 1;
          return (
            <div key={u.id} className={`${card} p-4 ${u.isActive ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{u.username}</span>
                    {u.displayName && <span className="text-sm text-muted">{u.displayName}</span>}
                    {isMe && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">คุณ</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-good-bg text-good" : "bg-chip text-muted"}`}>
                      {u.isActive ? "เปิดใช้" : "ปิดอยู่"}
                    </span>
                    {locked && <span className="rounded-full bg-urgent-bg px-2.5 py-0.5 text-xs font-semibold text-urgent">ล็อกชั่วคราว (ใส่รหัสผิดหลายครั้ง)</span>}
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    login ล่าสุด {when(u.lastLoginAt)} · สร้างเมื่อ {when(u.createdAt)}
                    {u.createdBy && ` โดย ${u.createdBy}`}
                  </p>
                </div>
                {!isMe && !lastActive && (
                  <div className="flex flex-wrap gap-1.5">
                    <IdButton action={toggleUser} id={u.id} label={u.isActive ? "ปิดใช้" : "เปิดใช้"} />
                  </div>
                )}
              </div>
              {!isMe && (
                <div className="mt-2 flex flex-wrap items-start gap-x-6 gap-y-2 text-sm">
                  <details>
                    <summary className="cursor-pointer text-brand">ตั้งรหัสผ่านใหม่{locked ? " / ปลดล็อก" : ""}</summary>
                    <ActionForm action={resetUserPassword} submitLabel="ตั้งรหัสใหม่" className="mt-3" resetOnSuccess>
                      <input type="hidden" name="id" value={u.id} />
                      <div className="flex flex-wrap gap-4">
                        <TextField name="password" label="รหัสผ่านใหม่" type="password" required hint={pwHint} autoComplete="new-password" />
                        <TextField name="confirm" label="ยืนยันรหัสผ่านใหม่" type="password" required autoComplete="new-password" />
                      </div>
                    </ActionForm>
                  </details>
                  {!lastActive && (
                    <details>
                      <summary className="cursor-pointer text-urgent">ลบ</summary>
                      <div className="mt-2">
                        <IdButton action={removeUser} id={u.id} label={`ยืนยันลบ ${u.username}`} className="border-urgent text-urgent" />
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="mt-8 rounded-2xl border border-dashed border-line p-5" aria-labelledby="add">
        <h2 id="add" className="font-bold">
          เพิ่มผู้ใช้
        </h2>
        <p className="mt-1 text-sm text-muted">ตั้งรหัสเริ่มต้นให้ แล้วส่งให้เจ้าของบัญชีทางช่องทางที่ปลอดภัย และให้เปลี่ยนเองหลัง login</p>
        <ActionForm action={addUser} submitLabel="เพิ่มผู้ใช้" className="mt-4" resetOnSuccess>
          <div className="flex flex-wrap gap-4">
            <TextField name="username" label="ชื่อผู้ใช้" required placeholder="เช่น somchai.k" autoComplete="off" hint="a-z 0-9 . _ - ยาว 3–64 ตัว" />
            <TextField name="displayName" label="ชื่อที่แสดง" placeholder="เช่น สมชาย (ทีม IT)" />
            <TextField name="password" label="รหัสผ่าน" type="password" required hint={pwHint} autoComplete="new-password" />
            <TextField name="confirm" label="ยืนยันรหัสผ่าน" type="password" required autoComplete="new-password" />
          </div>
        </ActionForm>
      </section>

      <section className={`${card} mt-8 p-5`} aria-labelledby="mine">
        <h2 id="mine" className="font-bold">
          เปลี่ยนรหัสผ่านของฉัน ({me.username})
        </h2>
        <ActionForm action={changeMyPassword} submitLabel="เปลี่ยนรหัสผ่าน" className="mt-4" resetOnSuccess>
          <div className="flex flex-wrap gap-4">
            <TextField name="current" label="รหัสผ่านปัจจุบัน" type="password" required autoComplete="current-password" />
            <TextField name="password" label="รหัสผ่านใหม่" type="password" required hint={pwHint} autoComplete="new-password" />
            <TextField name="confirm" label="ยืนยันรหัสผ่านใหม่" type="password" required autoComplete="new-password" />
          </div>
        </ActionForm>
      </section>
    </main>
  );
}
