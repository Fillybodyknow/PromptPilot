import type { Metadata } from "next";
import { AdminPage, EmptyState } from "@/components/admin/AdminPage";
import { card } from "@/components/site/ui";
import { requireAdminPage } from "@/lib/adminSession";
import { listRuns } from "@/lib/catalog/admin";

export const metadata: Metadata = { title: "ประวัติการดึงข่าว" };

const STATUS: Record<string, { label: string; cls: string }> = {
  running: { label: "กำลังทำงาน", cls: "bg-brand-soft text-brand" },
  ok: { label: "สำเร็จ", cls: "bg-good-bg text-good" },
  failed: { label: "มีปัญหา", cls: "bg-urgent-bg text-urgent" },
};

const fmt = (d: Date | null) =>
  d ? d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "-";

export default async function AdminRunsPage() {
  await requireAdminPage();
  const runs = await listRuns(50);

  return (
    <AdminPage title="ประวัติการดึงข่าว" description="50 รอบล่าสุด ทั้งที่ตั้งเวลาไว้และที่กดปุ่มในหน้าอนุมัติข่าว">
      {runs.length === 0 ? (
        <EmptyState>ยังไม่เคยดึงข่าว</EmptyState>
      ) : (
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-chip text-left text-muted">
              <th className="px-4 py-3 font-semibold">เริ่ม</th>
              <th className="px-4 py-3 font-semibold">สั่งโดย</th>
              <th className="px-4 py-3 font-semibold">ผล</th>
              <th className="px-4 py-3 font-semibold">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap px-4 py-3">{fmt(r.startedAt)}</td>
                <td className="px-4 py-3">{r.triggeredBy.startsWith("manual:") ? `กดปุ่ม (${r.triggeredBy.slice(7)})` : "ตั้งเวลา"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[r.status]?.cls ?? ""}`}>{STATUS[r.status]?.label ?? r.status}</span>
                </td>
                <td className="break-words px-4 py-3 text-muted">{r.message ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </AdminPage>
  );
}
