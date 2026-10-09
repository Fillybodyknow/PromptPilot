import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { recordAiUsage, type AiFeature } from "./usage";

/**
 * เรียก AI ให้ตอบเป็นข้อมูลตาม Zod schema — ใช้ Claude ก่อน ถ้าเรียกไม่สำเร็จใช้ OpenAI แทน (เหมือนการดึงข่าว)
 * ทุกครั้งที่เรียก (รวมที่ล้มเหลว) บันทึกลงตาราง ai_usage สำหรับหน้า /admin/ai-usage และงบรายเดือน
 * env: ANTHROPIC_API_KEY และ/หรือ OPENAI_API_KEY, ANTHROPIC_MODEL / OPENAI_MODEL (ไม่บังคับ)
 */

interface Tokens {
  input: number;
  output: number;
}

/** เรียกสำเร็จแต่ใช้ผลไม่ได้ (เช่น ตอบไม่จบ) — token ถูกคิดเงินไปแล้ว จึงพกจำนวนไว้บันทึก */
class UnusableResponse extends Error {
  constructor(
    message: string,
    readonly tokens: Tokens,
  ) {
    super(message);
  }
}

interface Provider {
  provider: "anthropic" | "openai";
  model: string;
  label: string;
  run<T>(schema: z.ZodType<T>, name: string, system: string, user: string, maxTokens: number): Promise<{ data: T; tokens: Tokens }>;
}

function anthropicProvider(): Provider {
  // จำกัดเวลาต่อการเรียก — ค่าเริ่มต้นของ SDK (10 นาที + retry) นานกว่าที่หน้า admin ถือว่ารอบตรวจค้าง (15 นาที)
  const client = new Anthropic({ timeout: 180_000, maxRetries: 1 });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  return {
    provider: "anthropic",
    model,
    label: `Claude (${model})`,
    async run(schema, _name, system, user, maxTokens) {
      const response = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(schema) },
      });
      const tokens = { input: response.usage.input_tokens, output: response.usage.output_tokens };
      if (response.stop_reason !== "end_turn" || !response.parsed_output) throw new UnusableResponse(`unexpected stop_reason=${response.stop_reason}`, tokens);
      return { data: response.parsed_output, tokens };
    },
  };
}

function openaiProvider(): Provider {
  const client = new OpenAI({ timeout: 180_000, maxRetries: 1 });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  // reasoning ใช้ได้เฉพาะโมเดลตระกูล gpt-5 / o-series ส่งให้รุ่นอื่นจะได้ 400
  const reasoning = /^(gpt-5|o\d)/.test(model) ? { reasoning: { effort: "low" as const } } : {};
  return {
    provider: "openai",
    model,
    label: `OpenAI (${model})`,
    async run(schema, name, system, user, maxTokens) {
      const response = await client.responses.parse({
        model,
        instructions: system,
        input: user,
        max_output_tokens: maxTokens,
        ...reasoning,
        text: { format: zodTextFormat(schema, name) },
      });
      const tokens = { input: response.usage?.input_tokens ?? 0, output: response.usage?.output_tokens ?? 0 };
      if (response.status !== "completed" || !response.output_parsed) {
        throw new UnusableResponse(`status=${response.status} ${response.incomplete_details?.reason ?? ""}`, tokens);
      }
      return { data: response.output_parsed as never, tokens };
    },
  };
}

/** ข้อความจาก API error ของทั้งสองเจ้า (Anthropic ซ้อน error.error.message, OpenAI ใช้ error.message) แทน JSON ดิบทั้งก้อน */
export function apiErrorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; error?: { message?: string } } };
  const msg = e?.error?.error?.message ?? e?.error?.message;
  if (msg) return e.status ? `${e.status} ${msg}` : msg;
  return err instanceof Error ? err.message : String(err);
}

export function hasAiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

/** ลองทีละเจ้าตามลำดับ คืนผลจากเจ้าแรกที่สำเร็จ ถ้าทุกเจ้าล้มเหลวโยน error พร้อมสาเหตุของแต่ละเจ้า */
export async function runStructured<T>(
  schema: z.ZodType<T>,
  name: string,
  system: string,
  user: string,
  opts: { feature: AiFeature; ref: string; maxTokens?: number },
): Promise<{ data: T; usage: string; label: string; failures: string[] }> {
  const providers = [
    ...(process.env.ANTHROPIC_API_KEY ? [anthropicProvider()] : []),
    ...(process.env.OPENAI_API_KEY ? [openaiProvider()] : []),
  ];
  if (providers.length === 0) throw new Error("ไม่มี API key ของ AI (ANTHROPIC_API_KEY หรือ OPENAI_API_KEY)");
  const failures: string[] = [];
  const base = { feature: opts.feature, ref: opts.ref };
  for (const p of providers) {
    try {
      const { data, tokens } = await p.run(schema, name, system, user, opts.maxTokens ?? 8000);
      await recordAiUsage({ ...base, provider: p.provider, model: p.model, inputTokens: tokens.input, outputTokens: tokens.output, ok: true });
      return { data, usage: `in ${tokens.input} / out ${tokens.output} tokens`, label: p.label, failures };
    } catch (err) {
      const message = apiErrorMessage(err);
      const tokens = err instanceof UnusableResponse ? err.tokens : { input: 0, output: 0 };
      await recordAiUsage({ ...base, provider: p.provider, model: p.model, inputTokens: tokens.input, outputTokens: tokens.output, ok: false, error: message });
      failures.push(`${p.label}: ${message}`.slice(0, 300));
    }
  }
  throw new Error(failures.join(" · "));
}
