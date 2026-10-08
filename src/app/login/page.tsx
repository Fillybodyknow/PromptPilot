import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageBanner } from "@/components/site/PageBanner";
import { card } from "@/components/site/ui";
import { withBasePath } from "@/lib/basePath";
import { msConfigured, msSettings } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/safeNext";
import { getSessionUser } from "@/lib/auth/session";
import { one, type SearchParams } from "@/lib/params";
import { HERO_VISUAL } from "@/lib/visuals";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false, follow: false } };

const NOTICES: Record<string, { tone: "info" | "error"; title: string; body: string }> = {
  "status:pending": {
    tone: "info",
    title: "ส่งคำขอเข้าใช้งานแล้ว",
    body: "บัญชีนี้ไม่ใช่บัญชีพนักงานของบริษัท ต้องรอผู้ดูแลระบบอนุมัติก่อน (อาจมีการติดต่อเพื่อยืนยันตัวตน) เมื่ออนุมัติแล้วกลับมากด “เข้าสู่ระบบด้วย Microsoft” อีกครั้ง",
  },
  "status:full": { tone: "error", title: "ยังรับคำขอเข้าใช้งานเพิ่มไม่ได้", body: "มีคำขอรออนุมัติอยู่มาก ลองใหม่ภายหลัง หรือติดต่อผู้ดูแลระบบ" },
  "status:denied": { tone: "error", title: "บัญชีนี้ไม่ได้รับสิทธิ์เข้าใช้งาน", body: "ถ้าคิดว่าควรได้สิทธิ์ ติดต่อผู้ดูแลระบบ" },
  "error:config": { tone: "error", title: "ยังไม่ได้ตั้งค่า Microsoft login", body: "ผู้ดูแล server ต้องใส่ MS_TENANT_ID, MS_CLIENT_ID และ MS_CLIENT_SECRET ตาม DEPLOY.md" },
  "error:unreachable": { tone: "error", title: "เชื่อมต่อ Microsoft ไม่ได้", body: "ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้ง IT (server ต้องออกไปที่ login.microsoftonline.com ได้)" },
  "error:cancelled": { tone: "info", title: "ยกเลิกการเข้าสู่ระบบแล้ว", body: "กดปุ่มด้านล่างเพื่อลองใหม่" },
  "error:expired": { tone: "error", title: "หมดเวลาเข้าสู่ระบบ", body: "กดปุ่มด้านล่างเพื่อเริ่มใหม่" },
  "error:failed": { tone: "error", title: "เข้าสู่ระบบไม่สำเร็จ", body: "ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้ง IT" },
};

function MicrosoftLogo() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const next = safeNext(one(sp.next));
  if (await getSessionUser()) redirect(next);

  const status = one(sp.status);
  const error = one(sp.error) ?? (msConfigured() ? undefined : "config");
  const notice = (status && NOTICES[`status:${status}`]) || (error && NOTICES[`error:${error}`]) || null;
  const startHref = withBasePath(`/auth/microsoft/start?next=${encodeURIComponent(next)}`);

  return (
    <>
      <PageBanner visual={HERO_VISUAL} size="sm">
        <h1 className="text-3xl font-bold">เข้าสู่ระบบ PromptPilot</h1>
        <p className="mt-2 text-white/80">ข่าว AI และคู่มือใช้ AI ในองค์กร สำหรับพนักงานของบริษัท</p>
      </PageBanner>
      <main className="mx-auto max-w-md px-4 pb-16 sm:px-6">
        <div className={`${card} relative z-10 -mt-8 flex flex-col gap-5 p-6 shadow-xl shadow-black/10 sm:p-8`}>
          {notice && (
            <div role="status" className={`rounded-xl px-4 py-3 ${notice.tone === "error" ? "bg-urgent-bg text-urgent" : "bg-brand-soft text-brand"}`}>
              <p className="font-semibold">{notice.title}</p>
              <p className="mt-1 text-sm leading-relaxed">{notice.body}</p>
            </div>
          )}
          {/* ลิงก์ธรรมดา (ไม่ใช่ next/link) — ไม่ให้ prefetch route ที่สร้าง state และส่งออกไป Microsoft */}
          <a
            href={startHref}
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-line bg-surface font-semibold text-ink shadow-sm transition hover:border-ink hover:shadow-md"
          >
            <MicrosoftLogo />
            เข้าสู่ระบบด้วย Microsoft
          </a>
          <p className="text-center text-sm leading-relaxed text-muted">
            {msSettings().allowExternal
              ? "พนักงานใช้บัญชี Microsoft 365 ของบริษัท เข้าใช้ได้ทันที บัญชีภายนอก (องค์กรอื่นหรือบัญชีส่วนตัว) ต้องรอผู้ดูแลระบบอนุมัติ"
              : "ใช้บัญชี Microsoft 365 ของบริษัท พนักงานเข้าใช้ได้ทันที บัญชีจากภายนอกบริษัทเข้าไม่ได้"}
          </p>
        </div>
      </main>
    </>
  );
}
