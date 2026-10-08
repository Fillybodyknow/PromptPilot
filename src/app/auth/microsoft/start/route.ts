import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isHttpsApp, msConfigured } from "@/lib/auth/config";
import { withBasePath } from "@/lib/basePath";
import { buildLoginRedirect, OIDC_COOKIE, OIDC_COOKIE_PATH } from "@/lib/auth/microsoft";
import { safeNext } from "@/lib/auth/safeNext";

/** ปุ่ม "เข้าสู่ระบบด้วย Microsoft" — สร้างค่ากัน CSRF เก็บใน cookie ชั่วคราว แล้วส่งไปหน้า login ของ Microsoft */
export async function GET(request: NextRequest) {
  // redirect() ใน route handler ไม่เติม basePath ให้เอง (ต่างจาก server action) จึงต้องเติมเอง
  if (!msConfigured()) redirect(withBasePath("/login?error=config"));
  let target: URL;
  try {
    const { url, state } = await buildLoginRedirect(safeNext(request.nextUrl.searchParams.get("next")));
    (await cookies()).set(OIDC_COOKIE, Buffer.from(JSON.stringify(state)).toString("base64url"), {
      httpOnly: true,
      secure: isHttpsApp(),
      sameSite: "lax",
      path: OIDC_COOKIE_PATH,
      maxAge: 600,
    });
    target = url;
  } catch (err) {
    console.error("[auth] โหลดค่าของ Microsoft Entra ID ไม่ได้:", err instanceof Error ? err.message : err);
    redirect(withBasePath("/login?error=unreachable"));
  }
  redirect(target.href);
}
