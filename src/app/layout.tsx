import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "PromptPilot",
  description: "ฐานข้อมูลเปรียบเทียบเครื่องมือ AI รายหมวด สำหรับผู้ใช้ในประเทศไทย",
  icons: {
    icon: "/images/app/app_logo.png",
    apple: "/images/app/app_logo.png",
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
        {/* Applies the saved theme class before hydration so there's no dark->light
            flash. Default (no localStorage entry) stays dark — matches the site's
            dark-first design. Raw <script> JSX tags never execute in React; this
            must go through next/script with beforeInteractive to run pre-paint. */}
        <Script
          id="no-flash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light')}}catch(e){}`,
          }}
        />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
