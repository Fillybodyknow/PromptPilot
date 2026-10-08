import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

export const config = {
  matcher: ["/admin/:path*"],
};

/** ตรวจแบบเร็วว่ามี cookie หรือไม่ (ไม่แตะ DB ตามคำแนะนำของ Next) — ตรวจจริงใน requireAdminPage / requireAdmin */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return;
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}
