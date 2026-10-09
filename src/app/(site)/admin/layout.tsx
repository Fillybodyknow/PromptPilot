import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSessionUser } from "@/lib/auth/session";
import { countPending } from "@/lib/auth/users";
import { countSuggestionsByStatus } from "@/lib/content/repo";
import { countByStatus } from "@/lib/news/repo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ใช้เลือกเมนูและตัวเลขงานค้าง — การกันสิทธิ์จริงอยู่ที่ requireAdminPage ในแต่ละหน้า (layout ไม่ render ใหม่ทุกครั้งที่เปลี่ยนหน้า)
  const user = await getSessionUser();
  const staff = user && user.role !== "viewer";
  const [news, suggestions, users] = staff
    ? await Promise.all([countByStatus(), countSuggestionsByStatus(), user.role === "admin" ? countPending() : 0])
    : [{}, {}, 0];
  return (
    <div className="lg:flex lg:min-h-[calc(100vh-4rem)]">
      <AdminSidebar
        counts={{ news: (news as Record<string, number>).pending ?? 0, suggestions: (suggestions as Record<string, number>).pending ?? 0, users }}
        isAdmin={user?.role === "admin"}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
