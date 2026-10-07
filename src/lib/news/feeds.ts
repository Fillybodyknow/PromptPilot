import { createHash } from "node:crypto";
import Parser from "rss-parser";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export interface Candidate {
  id: string;
  url: string;
  source: string;
  title: string;
  snippet: string;
  publishedAt: string;
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith("utm_")) u.searchParams.delete(key);
  }
  u.hostname = u.hostname.toLowerCase();
  return u.toString().replace(/\/$/, "");
}

const idOf = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 16);

const parser = new Parser();

function assertHttp(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error(`ไม่รองรับ ${u.protocol} (ใช้ได้เฉพาะ http/https)`);
  return u;
}

/** ตาม redirect เอง เพื่อตรวจ scheme ทุกครั้ง และอ่าน body ไม่เกิน MAX_FEED_BYTES */
async function fetchFeedText(url: string, signal: AbortSignal): Promise<string> {
  let current = assertHttp(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { headers: { "User-Agent": "PromptPilot-NewsBot/1.0" }, signal, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel();
      current = assertHttp(new URL(res.headers.get("location")!, current).toString());
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status}`);
    }
    if (!res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error("feed ใหญ่เกิน 5 MB");
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error("redirect หลายต่อเกินไป");
}

// ใช้ fetch เองแทน parser.parseURL: ตัวนั้นไม่ abort request ที่ timeout และไม่อ่าน body ตอน redirect
// ทำให้ socket ค้างและ process ไม่ยอมจบ
export async function fetchSource(src: { name: string; url: string }): Promise<Candidate[]> {
  const feed = await parser.parseString(await fetchFeedText(src.url, AbortSignal.timeout(FETCH_TIMEOUT_MS)));
  const out: Candidate[] = [];
  for (const it of feed.items) {
    const link = it.link ?? it.guid;
    const title = it.title?.trim();
    if (!link || !title) continue;
    let url: string;
    try {
      url = normalizeUrl(link);
    } catch {
      continue;
    }
    const date = new Date(it.isoDate ?? it.pubDate ?? "");
    out.push({
      id: idOf(url),
      url,
      source: src.name,
      title,
      snippet: (it.contentSnippet ?? "").replace(/\s+/g, " ").trim().slice(0, 600),
      publishedAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    });
  }
  return out;
}
