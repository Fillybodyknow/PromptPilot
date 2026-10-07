import type { StaticImageData } from "next/image";
import comm from "@/assets/backgrounds/comm.webp";
import data from "@/assets/backgrounds/data.webp";
import design from "@/assets/backgrounds/design.webp";
import dev from "@/assets/backgrounds/dev.webp";
import docs from "@/assets/backgrounds/docs.webp";
import general from "@/assets/backgrounds/general.webp";
import hero from "@/assets/backgrounds/hero.webp";
import systems from "@/assets/backgrounds/systems.webp";

export interface Visual {
  src: StaticImageData;
  alt: string;
}

export const HERO_VISUAL: Visual = { src: hero, alt: "ทีมงานในองค์กรใช้ผู้ช่วย AI และจอสัมผัสวิเคราะห์ข้อมูลร่วมกัน" };

/** รูปประจำกลุ่มงาน — ใช้เป็น banner หน้าคู่มือ/เครื่องมือ และการ์ดกลุ่มงาน */
export const GROUP_VISUALS: Record<string, Visual> = {
  ผู้ช่วยทั่วไป: { src: general, alt: "พนักงานใช้ผู้ช่วย AI และ dashboard ช่วยวิเคราะห์งานประจำวัน" },
  งานเอกสาร: { src: docs, alt: "ทีมประชุมและนำเสนองานด้วยจอแสดงผลโครงข่าย AI" },
  งานพัฒนาระบบ: { src: dev, alt: "ทีมพัฒนาซอฟต์แวร์ทำงานหน้าห้อง server" },
  งานข้อมูล: { src: data, alt: "ทีมวิเคราะห์ข้อมูลคลังสินค้าด้วย AI และกราฟพยากรณ์" },
  งานออกแบบ: { src: design, alt: "นักออกแบบใช้เครื่องมือ AI สร้างภาพ" },
  งานสื่อสาร: { src: comm, alt: "ประชุมข้ามภาษาโดยมี AI แปลแบบ real-time" },
  งานระบบ: { src: systems, alt: "ทีมดูแลระบบอัตโนมัติวิเคราะห์ข้อมูลบนโต๊ะ hologram" },
};

export const PAGE_VISUALS = {
  news: GROUP_VISUALS["ผู้ช่วยทั่วไป"],
  guides: GROUP_VISUALS["งานเอกสาร"],
  tools: GROUP_VISUALS["งานพัฒนาระบบ"],
};

export const groupVisual = (group: string): Visual => GROUP_VISUALS[group] ?? HERO_VISUAL;
