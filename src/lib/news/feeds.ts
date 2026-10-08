import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { fetchText } from "../http";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FEED_BYTES = 5 * 1024 * 1024;

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

async function fetchFeedText(url: string, signal: AbortSignal): Promise<string> {
  return (await fetchText(url, { signal, maxBytes: MAX_FEED_BYTES, userAgent: "PromptPilot-NewsBot/1.0" })).text;
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
