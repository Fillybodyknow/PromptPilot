/** ดึงข้อความจาก URL ภายนอกอย่างปลอดภัย — ใช้ร่วมกันระหว่างการดึงข่าว (RSS) และการตรวจหน้าทางการของเครื่องมือ */

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const MAX_REDIRECTS = 5;

/**
 * เครือข่ายภายใน/พิเศษ — กันหน้าเว็บภายนอก redirect เข้าเครื่องในบริษัท (intranet, localhost, cloud metadata)
 * แล้วข้อความในนั้นถูกส่งต่อให้ AI ภายนอก
 */
const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) PRIVATE.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) PRIVATE.addSubnet(net, prefix, "ipv6");

function isPrivateAddress(addr: string): boolean {
  const mapped = addr.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return PRIVATE.check(mapped, "ipv4");
  const family = isIP(addr);
  return family === 0 || PRIVATE.check(addr, family === 4 ? "ipv4" : "ipv6");
}

async function assertHttp(url: string): Promise<URL> {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error(`ไม่รองรับ ${u.protocol} (ใช้ได้เฉพาะ http/https)`);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addrs.length === 0 || addrs.some(isPrivateAddress)) throw new Error(`ไม่อนุญาตให้เปิดที่อยู่ในเครือข่ายภายใน (${u.hostname})`);
  return u;
}

/**
 * ตาม redirect เอง เพื่อตรวจ scheme ทุกครั้ง และอ่าน body ไม่เกิน maxBytes
 * คืน URL สุดท้ายหลัง redirect ด้วย (ใช้บอกว่าข้อมูลมาจากหน้าไหนจริง)
 */
export async function fetchText(
  url: string,
  opts: { signal: AbortSignal; maxBytes: number; userAgent: string; accept?: string; acceptLanguage?: string },
): Promise<{ text: string; finalUrl: string; contentType: string }> {
  let current = await assertHttp(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      headers: {
        "User-Agent": opts.userAgent,
        ...(opts.accept ? { Accept: opts.accept } : {}),
        ...(opts.acceptLanguage ? { "Accept-Language": opts.acceptLanguage } : {}),
      },
      signal: opts.signal,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel();
      current = await assertHttp(new URL(res.headers.get("location")!, current).toString());
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.body) return { text: "", finalUrl: current.toString(), contentType };
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > opts.maxBytes) {
        await reader.cancel();
        throw new Error(`เนื้อหาใหญ่เกิน ${Math.round(opts.maxBytes / 1024 / 1024)} MB`);
      }
      chunks.push(value);
    }
    return { text: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: current.toString(), contentType };
  }
  throw new Error("redirect หลายต่อเกินไป");
}
