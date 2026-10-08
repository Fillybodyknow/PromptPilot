import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import { ViewTransition } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PointerTilt } from "@/components/site/PointerTilt";
import { withBasePath } from "@/lib/basePath";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: { default: "PromptPilot — ข่าว AI และคู่มือใช้ AI ในองค์กร", template: "%s | PromptPilot" },
  description: "สรุปข่าว AI ที่มีผลต่อองค์กรไทยทุกวัน พร้อมคู่มือและเครื่องมือ AI ที่ทีมตรวจสอบแล้ว แยกตามลักษณะงาน",
  // เว็บภายในบริษัท (ต้อง login) — ไม่ให้ search engine เก็บหรือแสดงในผลค้นหา
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  icons: {
    icon: withBasePath("/images/app/app_logo.png"),
    apple: withBasePath("/images/app/app_logo.png"),
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} h-full antialiased`}
      // The no-flash script below deliberately adds a "light" class to this
      // element before React hydrates, so its className will legitimately
      // differ from what was server-rendered — telling React to ignore that
      // one mismatch here (not the same thing as attribute correctness).
      suppressHydrationWarning
    >
      <body id="top" className="flex min-h-full flex-col bg-background text-foreground">
        {/* Applies the theme class before hydration so there's no flash. Follows the
            OS preference until the user picks one with ThemeToggle. Raw <script> JSX
            tags never execute in React; this must go through next/script with
            beforeInteractive to run pre-paint. */}
        <Script
          id="no-flash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'||(t!=='dark'&&window.matchMedia('(prefers-color-scheme: light)').matches)){document.documentElement.classList.add('light')}}catch(e){}`,
          }}
        />
        <SiteHeader />
        {/* เปลี่ยนหน้าแบบจางออก-เลื่อนขึ้น (ดู .page ใน globals.css) — header/footer อยู่นอกจึงนิ่ง */}
        <ViewTransition default="page">
          <div className="flex-1">{children}</div>
        </ViewTransition>
        <SiteFooter />
        <a
          href="#top"
          aria-label="กลับขึ้นด้านบน"
          className="to-top fixed bottom-5 right-5 z-30 h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
        >
          ↑
        </a>
        <PointerTilt />
      </body>
    </html>
  );
}
