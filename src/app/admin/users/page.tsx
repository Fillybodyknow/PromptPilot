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

const ROLE_HINT: Record<UserRole, string> = {
  viewer: "อ่านข่าว คู่มือ เครื่องมือ",
  editor: "อ่าน + แก้เนื้อหาในหน้า Admin",
  admin: "ทำได้ทุกอย่าง + จัดการผู้ใช้",
};

function RoleSelect({ defaultValue = "viewer" }: { defaultValue?: UserRole }) {
  return (
    <select name="role" defaultValue={defaultValue} aria-label="ระดับสิทธิ์" className="h-11 rounded-lg border border-line bg-background px-3 text-sm text-ink">
      {(["viewer", "editor", "admin"] as const).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]} — {ROLE_HINT[r]}
        </option>
      ))}
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
        {u.displayName ? `${u.email} · ` : ""}เข้าใช้ครั้งแรก {when(u.requestedAt)}
        {u.decidedBy && ` · ${STATUS_LABEL[u.status]}โดย ${u.decidedBy} ${when(u.decidedAt)}`}
        {u.status === "active" && ` · login ล่าสุด ${when(u.lastLoginAt)}`}
      </p>
    </div>
  );
}

/** ปุ่มจัดการของผู้ใช้ที่ใช้งานอยู่: เปลี่ยนสิทธิ์ ปิดใช้ ลบ (ไม่แสดงกับตัวเอง) */
function ActiveControls({ u }: { u: UserRow }) {
  return (
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
  );
}

export default async function AdminUsersPage() {
  const me = await requireSystemAdminPage();
  const all = await listUsers();
  const pending = all.filter((u) => u.status === "pending");
  const staff = all.filter((u) => u.status === "active" && u.role !== "viewer");
  const readers = all.filter((u) => u.status === "active" && u.role === "viewer");
  const inactive = all.filter((u) => u.status === "rejected" || u.status === "disabled");

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold">ผู้ใช้</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        ทั้งเว็บต้อง login ด้วย Microsoft 365 ของบริษัท พนักงานที่ login ครั้งแรกเป็น <strong>{ROLE_LABEL.viewer}</strong> ทันที บัญชี guest จากองค์กรอื่นต้องรออนุมัติ ·{" "}
        {ROLE_LABEL.editor}: {ROLE_HINT.editor} · {ROLE_LABEL.admin}: {ROLE_HINT.admin}
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

      <section className="mt-8" aria-labelledby="staff">
        <h2 id="staff" className="text-lg font-bold">
          ทีมดูแล ({staff.length})
        </h2>
        <p className="mt-1 text-sm text-muted">{ROLE_LABEL.admin} และ{ROLE_LABEL.editor} — เข้าหน้า Admin ได้</p>
        <div className="mt-3 flex flex-col gap-3">
          {staff.map((u) => (
            <div key={u.id} className={`${card} p-4`}>
              <Who u={u} isMe={u.id === me.userId} />
              {u.id !== me.userId && <ActiveControls u={u} />}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="readers">
        <h2 id="readers" className="text-lg font-bold">
          ผู้อ่าน ({readers.length})
        </h2>
        <p className="mt-1 text-sm text-muted">พนักงานที่เคย login · ถ้าจะให้ช่วยดูแลเนื้อหา เปลี่ยนสิทธิ์เป็น{ROLE_LABEL.editor}</p>
        {readers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">ยังไม่มีพนักงานคนอื่น login</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {readers.map((u) => (
              <div key={u.id} className={`${card} p-4`}>
                <Who u={u} isMe={u.id === me.userId} />
                {u.id !== me.userId && <ActiveControls u={u} />}
              </div>
            ))}
          </div>
        )}
      </section>

      {inactive.length > 0 && (
        <section className="mt-8" aria-labelledby="inactive">
          <h2 id="inactive" className="text-lg font-bold">
            ปฏิเสธ / ปิดใช้ ({inactive.length})
          </h2>
          <p className="mt-1 text-sm text-muted">คนกลุ่มนี้เข้าเว็บไม่ได้ · ถ้าลบออก พนักงานจะกลับมาเป็นผู้อ่านเมื่อ login ครั้งหน้า (guest จะเป็นคำขอใหม่)</p>
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
