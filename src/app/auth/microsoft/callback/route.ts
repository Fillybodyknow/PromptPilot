import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { withBasePath } from "@/lib/basePath";
import { completeLogin, OIDC_COOKIE, OIDC_COOKIE_PATH, type MicrosoftIdentity, type OidcState } from "@/lib/auth/microsoft";
import { safeNext } from "@/lib/auth/safeNext";
import { createSession } from "@/lib/auth/session";
import { markLoggedIn, upsertMicrosoftUser } from "@/lib/auth/users";

function readState(raw: string | undefined): OidcState | null {
  if (!raw) return null;
  try {
    const st = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OidcState>;
    return st.verifier && st.state && st.nonce ? { verifier: st.verifier, state: st.state, nonce: st.nonce, next: st.next ?? "/admin" } : null;
  } catch {
    return null;
  }
}

/** Microsoft ส่งผู้ใช้กลับมาที่นี่หลัง login — ตรวจผล แล้วสร้าง session / ส่งไปหน้ารออนุมัติ */
// หมายเหตุ: redirect() ใน route handler ไม่เติม basePath ให้เอง จึงห่อด้วย withBasePath ทุกครั้ง
export async function GET(request: NextRequest) {
  const store = await cookies();
  const st = readState(store.get(OIDC_COOKIE)?.value);
  // ใช้ได้ครั้งเดียว กันเอา URL callback เดิมมาเล่นซ้ำ
  store.delete({ name: OIDC_COOKIE, path: OIDC_COOKIE_PATH });

  const params = request.nextUrl.searchParams;
  if (params.get("error")) {
    // เช่นผู้ใช้กดยกเลิก หรือ IT ยังไม่อนุญาตแอป — error_description มาจาก Microsoft ไม่ใส่ลงหน้าเว็บตรงๆ
    console.warn("[auth] Microsoft ตอบ error:", params.get("error"), params.get("error_description")?.slice(0, 300));
    redirect(withBasePath(params.get("error") === "access_denied" ? "/login?error=cancelled" : "/login?error=failed"));
  }
  if (!st) redirect(withBasePath("/login?error=expired"));

  let identity: MicrosoftIdentity;
  try {
    identity = await completeLogin(request.nextUrl.search, st);
  } catch (err) {
    // log แค่ข้อความ — error ของการตรวจ token อาจแนบ claims (อีเมล ชื่อ) มาด้วย ไม่ควรลง log
    console.error("[auth] ตรวจผล login จาก Microsoft ไม่ผ่าน:", err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    redirect(withBasePath("/login?error=failed"));
  }

  const user = await upsertMicrosoftUser(identity);
  if (user.status === "full") redirect(withBasePath("/login?status=full"));
  if (user.status === "pending") redirect(withBasePath("/login?status=pending"));
  if (user.status !== "active") redirect(withBasePath("/login?status=denied"));

  await createSession(user.id);
  await markLoggedIn(user.id);
  redirect(withBasePath(safeNext(st.next)));
}
