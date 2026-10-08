/** โครงหน้าของหน้า login — เต็มจอ ไม่มี top bar / footer ของเว็บ แต่ใช้ธีมและฟอนต์เดียวกัน (มาจาก root layout) */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1">{children}</div>;
}
