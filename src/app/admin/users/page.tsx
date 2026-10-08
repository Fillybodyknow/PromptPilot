import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { IdButton } from "@/components/admin/fields";
import { card } from "@/components/site/ui";
import { requireSystemAdminPage } from "@/lib/adminSession";
import { listUsers, ROLE_LABEL, STATUS_LABEL, type UserRole, type UserRow } from "@/lib/auth/users";
import { approveUser, disableUser, enableUser, rejectUser, removeUser, setRole } from "./actions";

export const metadata: Metadata = { title: "ผู้ใช้" };

const when = (d: Date | null) =>
  d ? d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "ยังไม่เคย";

const STATUS_STYLE = {
  pending: "bg-warn-bg text-warn",
  active: "bg-good-bg text-good",
  rejected: "bg-urgent-bg text-urgent",
  disabled: "bg-chip text-muted",
} as const;

function RoleSelect({ defaultValue = "editor" }: { defaultValue?: UserRole }) {
  return (
    <select name="role" defaultValue={defaultValue} aria-label="ระดับสิทธิ์" className="h-11 rounded-lg border border-line bg-background px-3 text-sm text-ink">
      <option value="editor">{ROLE_LABEL.editor} — แก้เนื้อหาได้ทุกส่วน</option>
      <option value="admin">{ROLE_LABEL.admin} — แก้เนื้อหา + จัดการผู้ใช้</option>
    </select>
  );
}

function Who({ u, isMe }: { u: UserRow; isMe: boolean }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{u.displayName ?? u.email}</span>
        {isMe && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">คุณ</span>}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
        {u.status === "active" && <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs">{ROLE_LABEL[u.role]}</span>}
        {u.isGuest && (
          <span className="rounded-full bg-urgent-bg px-2.5 py-0.5 text-xs font-semibold text-urgent" title="บัญชีที่ถูกเชิญจากองค์กรอื่น ไม่ใช่บัญชีพนักงาน">
            guest จากองค์กรอื่น
          </span>
        )}
      </div>
      <p className="mt-1 break-all text-[13px] text-muted">
        {u.displayName ? `${u.email} · ` : ""}ขอเข้าใช้ {when(u.requestedAt)}
        {u.decidedBy && ` · ${STATUS_LABEL[u.status]}โดย ${u.decidedBy} ${when(u.decidedAt)}`}
        {u.status === "active" && ` · login ล่าสุด ${when(u.lastLoginAt)}`}
      </p>
    </div>
  );
}

export default async function AdminUsersPage() {
  const me = await requireSystemAdminPage();
  const all = await listUsers();
  const pending = all.filter((u) => u.status === "pending");
  const active = all.filter((u) => u.status === "active");
  const inactive = all.filter((u) => u.status === "rejected" || u.status === "disabled");

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold">ผู้ใช้</h1>
      <p className="mt-1 text-sm text-muted">
        พนักงาน login ด้วย Microsoft 365 ของบริษัท ครั้งแรกจะเป็นคำขอเข้าใช้งาน · {ROLE_LABEL.editor}: อนุมัติข่าวและแก้เนื้อหาได้ทุกส่วน ·{" "}
        {ROLE_LABEL.admin}: ทำได้ทุกอย่าง และจัดการผู้ใช้ในหน้านี้
      </p>

      <section className="mt-6" aria-labelledby="pending">
        <h2 id="pending" className="text-lg font-bold">
          คำขอรออนุมัติ ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ไม่มีคำขอใหม่</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((u) => (
              <div key={u.id} className={`${card} border-warn p-4`}>
                <Who u={u} isMe={false} />
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  <ActionForm action={approveUser} submitLabel="อนุมัติ" pendingLabel="กำลังอนุมัติ…" className="flex flex-wrap items-start gap-3 [&>div]:mt-0">
                    <input type="hidden" name="id" value={u.id} />
                    <RoleSelect />
                  </ActionForm>
                  <IdButton action={rejectUser} id={u.id} label="ปฏิเสธ" className="h-11 border-urgent px-4 text-urgent" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="active">
        <h2 id="active" className="text-lg font-bold">
          ผู้ใช้งาน ({active.length})
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {active.map((u) => {
            const isMe = u.id === me.userId;
            return (
              <div key={u.id} className={`${card} p-4`}>
                <Who u={u} isMe={isMe} />
                {!isMe && (
                  <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3 text-sm">
                    <ActionForm action={setRole} submitLabel="เปลี่ยนสิทธิ์" variant="neutral" className="flex flex-wrap items-start gap-3 [&>div]:mt-0">
                      <input type="hidden" name="id" value={u.id} />
                      <RoleSelect defaultValue={u.role} />
                    </ActionForm>
                    <IdButton action={disableUser} id={u.id} label="ปิดใช้" className="h-11 px-4" />
                    <details>
                      <summary className="flex h-11 cursor-pointer items-center text-urgent">ลบ</summary>
                      <div className="mt-2">
                        <IdButton action={removeUser} id={u.id} label={`ยืนยันลบ ${u.email}`} className="border-urgent text-urgent" />
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {inactive.length > 0 && (
        <section className="mt-8" aria-labelledby="inactive">
          <h2 id="inactive" className="text-lg font-bold">
            ปฏิเสธ / ปิดใช้ ({inactive.length})
          </h2>
          <p className="mt-1 text-sm text-muted">คนกลุ่มนี้ login แล้วจะเห็นว่าไม่ได้รับสิทธิ์ · ถ้าลบออก ครั้งหน้าที่ login จะกลายเป็นคำขอใหม่</p>
          <div className="mt-3 flex flex-col gap-3">
            {inactive.map((u) => (
              <div key={u.id} className={`${card} p-4 opacity-80`}>
                <Who u={u} isMe={false} />
                <div className="mt-3 flex flex-wrap items-start gap-3 text-sm">
                  <IdButton action={enableUser} id={u.id} label={`เปิดใช้ (เป็น${ROLE_LABEL[u.role]})`} className="h-11 px-4" />
                  <IdButton action={removeUser} id={u.id} label="ลบ" className="h-11 border-urgent px-4 text-urgent" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
