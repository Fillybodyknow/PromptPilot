import { createHash } from "node:crypto";
import { fetchText } from "../http";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_PAGE_BYTES = 3 * 1024 * 1024;
/** ข้อความต่อหน้าที่ส่งให้ AI — หน้าราคาส่วนใหญ่อยู่ในช่วงนี้ เกินจากนี้เปลือง token โดยไม่ได้ข้อมูลเพิ่ม */
export const MAX_PAGE_CHARS = 14_000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** HTML → ข้อความล้วน (ตัด script/style/nav ออก) ให้ AI อ่านและใช้เทียบข้อความหลักฐาน */
export function htmlToText(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return [title, description, body]
    .join("\n")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** ใช้เทียบข้อความหลักฐาน: ไม่สนตัวพิมพ์เล็กใหญ่ ช่องว่าง และเครื่องหมายคำพูดแบบต่างๆ */
export const normalizeForMatch = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * ตัดหน้าให้ไม่เกิน max ตัวอักษร โดยเก็บส่วนที่พูดถึงเครื่องมือนี้ไว้ก่อน — หน้าราคารวมหลายรุ่นมักยาวเกิน
 * และรุ่นที่ต้องการอาจอยู่ท้ายหน้า (ตัดแค่ต้นหน้าแล้ว AI จะไม่เห็น)
 * เก็บบรรทัดที่มีคำค้น ± บรรทัดรอบข้าง (ราคามักอยู่บรรทัดถัดจากชื่อรุ่น) ก่อน ตามลำดับคำค้น (คำแรกสำคัญสุด)
 * แล้วใช้ที่เหลือเติมต้นหน้า — บรรทัดที่ยาวเกินที่เหลือถูกตัดให้พอดี ไม่ทิ้งทั้งบรรทัด
 */
export function focusText(text: string, keywords: string[], max = MAX_PAGE_CHARS): string {
  if (text.length <= max) return text;
  const lines = text.split("\n");
  const keys = keywords.map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 3);
  const chosen = new Map<number, string>(); // บรรทัด → ข้อความที่ใช้ (อาจถูกตัด)
  let budget = max;
  // แต่ละบรรทัดใช้ความยาว + ขึ้นบรรทัด + เผื่อเครื่องหมาย "…" คั่นช่วงที่ข้าม
  const take = (i: number) => {
    if (chosen.has(i) || budget <= 3) return;
    const room = budget - 3;
    const line = lines[i].length > room ? lines[i].slice(0, room) : lines[i];
    chosen.set(i, line);
    budget -= line.length + 3;
  };
  for (const k of keys) {
    lines.forEach((l, i) => {
      if (l.toLowerCase().includes(k)) for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 8); j++) take(j);
    });
  }
  // ที่เหลือ → ต้นหน้า (ชื่อหน้า หัวตาราง คำอธิบายหน่วยราคา)
  for (let i = 0; i < lines.length && budget > 3; i++) take(i);
  let out = "";
  let prev = -1;
  for (const i of [...chosen.keys()].sort((a, b) => a - b)) {
    out += (prev >= 0 && i !== prev + 1 ? "…\n" : "") + chosen.get(i) + "\n";
    prev = i;
  }
  return out;
}

export interface FetchedPage {
  url: string;
  finalUrl: string;
  text: string;
  hash: string;
}

/** ดึงหน้าแล้วแปลงเป็นข้อความ — หน้าที่เป็น JavaScript ล้วนจะได้ข้อความน้อยมาก ซึ่งถือว่าตรวจอัตโนมัติไม่ได้ */
export async function fetchPage(url: string): Promise<FetchedPage> {
  const { text, finalUrl, contentType } = await fetchText(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    maxBytes: MAX_PAGE_BYTES,
    // บางเว็บปฏิเสธ user agent ที่ดูเป็นบอท จึงบอกตรงๆ ว่าเป็นตัวตรวจข้อมูลของ PromptPilot
    userAgent: "Mozilla/5.0 (compatible; PromptPilot-ContentCheck/1.0)",
    accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
    // ขอภาษาอังกฤษเสมอ — ไม่อย่างนั้นบางเว็บ (เช่นของ Google) สุ่มส่งภาษาตามที่ตั้ง server/บางครั้งเป็นภาษาอื่น
    // ทำให้ hash เปลี่ยนทั้งที่เนื้อหาเดิม และข้อความหลักฐานของ AI ไม่ตรงกันระหว่างรอบ
    acceptLanguage: "en-US,en;q=0.9",
  });
  const plain = /html|xml/i.test(contentType) || /<html|<body/i.test(text.slice(0, 2000)) ? htmlToText(text) : text.trim();
  if (plain.length < 200) throw new Error("หน้านี้แทบไม่มีข้อความ (อาจโหลดด้วย JavaScript หรือกันบอท) — ต้องตรวจเอง");
  // hash จากบรรทัดที่เรียงใหม่ (ไม่สนลำดับ แต่นับบรรทัดซ้ำ — ราคาที่เปลี่ยนไปซ้ำกับราคาอื่นในหน้ายังถือว่าเปลี่ยน)
  // ใช้บอกว่าเนื้อหาเปลี่ยนจากที่ AI ตรวจครั้งก่อนหรือไม่
  const lines = plain.split("\n").map((l) => l.trim()).sort();
  return { url, finalUrl, text: plain, hash: createHash("sha256").update(lines.join("\n")).digest("hex") };
}
