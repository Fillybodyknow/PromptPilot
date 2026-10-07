// แยกจาก MainNav.tsx ("use client") — ค่าที่ export จากไฟล์ client จะกลายเป็น client reference เมื่อ server component import
export const NAV_ITEMS = [
  { href: "/news", label: "ข่าว AI" },
  { href: "/guides", label: "คู่มือตามงาน" },
  { href: "/tools", label: "เครื่องมือ" },
] as const;
