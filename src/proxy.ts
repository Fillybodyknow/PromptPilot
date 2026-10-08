import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { findSessionByToken } from "@/lib/auth/sessionLookup";
import { isStaff } from "@/lib/auth/users";

/**
 * ด่านหน้าของทั้งเว็บ: ทุกหน้า ทุก API และทุก server action ต้อง login ด้วย Microsoft ก่อน
 * ยกเว้นหน้า login, การ login กับ Microsoft และไฟล์ static (รูป ฟอนต์ ไอคอน) ซึ่งไม่มีข้อมูลภายใน
 * ตรวจ session กับฐานข้อมูลจริงทุกครั้ง (proxy ของ Next 16 รันบน Node.js) ไม่ใช่แค่ดูว่ามี cookie
 * หน้า admin และ action ของ admin ยังตรวจสิทธิ์ซ้ำในตัวเองอีกชั้น (requireAdminPage / requireAdmin)
 */
export const config = {
  matcher: [
    // ทุก path ยกเว้นไฟล์ build ของ Next, ตัวย่อรูป และไฟล์ static ใน public/ (images/, ไอคอน .svg ที่ราก, robots.txt)
    // ระบุตำแหน่งจริงเท่านั้น ไม่ยกเว้นตามนามสกุลทั้งเว็บ — ไม่อย่างนั้นหน้าที่ slug ลงท้าย .svg/.txt จะเปิดได้โดยไม่ login
    "/((?!_next/static|_next/image|images/|favicon\\.ico$|robots\\.txt$|[^/]+\\.svg$).*)",
  ],
};

// /api/health ใช้โดยสคริปต์ติดตั้ง/อัปเดตเช็กว่าเว็บและฐานข้อมูลพร้อม (ไม่คืนข้อมูลภายใน)
const PUBLIC = /^\/(login|auth\/microsoft\/(start|callback)|api\/health)(\/|$)/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.test(pathname)) return;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await findSessionByToken(token) : null;

  if (!user) {
    // API และ server action (POST ที่มี header Next-Action) ตอบ 401 — การ redirect ไปหน้า HTML ทำให้ฝั่ง client งง
    if (pathname.startsWith("/api/") || request.headers.has("next-action")) {
      return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" && !search ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // ผู้อ่าน (พนักงานทั่วไป) เข้าหน้า admin ไม่ได้
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !isStaff(user.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
}
