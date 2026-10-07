import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { withBasePath } from "@/lib/basePath";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: { default: "PromptPilot — ข่าว AI และคู่มือใช้ AI ในองค์กร", template: "%s | PromptPilot" },
  description: "สรุปข่าว AI ที่มีผลต่อองค์กรไทยทุกวัน พร้อมคู่มือและเครื่องมือ AI ที่ทีมตรวจสอบแล้ว แยกตามลักษณะงาน",
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
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
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
