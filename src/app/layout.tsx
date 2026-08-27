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
  title: "แนะนำการใช้ AI",
  description: "ฐานข้อมูลเปรียบเทียบเครื่องมือ AI รายหมวด สำหรับผู้ใช้ในประเทศไทย",
};

// Sets .dark on <html> before first paint based on saved preference (or system default)
// so the page never flashes the wrong theme. Loaded via next/script (strategy="beforeInteractive")
// rather than a raw <script> tag — React never executes script elements it renders itself, and
// beforeInteractive is Next's supported mechanism for a script that must run before hydration;
// it's auto-hoisted into <head> regardless of where the component sits in the tree.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var wantsDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (wantsDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <Script
          id="no-flash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
