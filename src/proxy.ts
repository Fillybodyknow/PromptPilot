import type { NextRequest } from "next/server";
import { ADMIN_REALM, checkBasicAuth } from "@/lib/adminAuth";

export const config = {
  matcher: ["/admin/:path*"],
};

export function proxy(request: NextRequest) {
  if (!checkBasicAuth(request.headers.get("authorization"))) {
    return new Response("ต้องเข้าสู่ระบบก่อนใช้หน้า admin", {
      status: 401,
      headers: { "WWW-Authenticate": ADMIN_REALM, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
