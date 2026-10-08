import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { PageBanner } from "@/components/site/PageBanner";
import { card } from "@/components/site/ui";
import { getSessionUser } from "@/lib/auth/session";
import { one, type SearchParams } from "@/lib/params";
import { HERO_VISUAL } from "@/lib/visuals";
import { safeNext } from "@/lib/auth/safeNext";
import { login } from "./actions";

export const metadata: Metadata = { title: "เข้าสู่ระบบผู้ดูแล", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const next = safeNext(one((await searchParams).next));
  if (await getSessionUser()) redirect(next);

  return (
    <>
      <PageBanner visual={HERO_VISUAL} size="sm">
        <h1 className="text-3xl font-bold">เข้าสู่ระบบผู้ดูแล</h1>
        <p className="mt-2 text-white/80">สำหรับทีมที่อนุมัติข่าวและแก้ไขเครื่องมือ คู่มือ และแหล่งข่าว</p>
      </PageBanner>
      <main className="mx-auto max-w-md px-4 pb-16 sm:px-6">
        <div className={`${card} relative z-10 -mt-8 p-6 shadow-xl shadow-black/10 sm:p-8`}>
          <LoginForm action={login} next={next} />
        </div>
        <p className="mt-4 text-center text-sm text-muted">ลืมรหัสผ่าน ให้ผู้ดูแลคนอื่นตั้งรหัสใหม่ให้ในหน้า “ผู้ใช้”</p>
      </main>
    </>
  );
}
