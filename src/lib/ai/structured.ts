import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

/**
 * เรียก AI ให้ตอบเป็นข้อมูลตาม Zod schema — ใช้ Claude ก่อน ถ้าเรียกไม่สำเร็จใช้ OpenAI แทน (เหมือนการดึงข่าว)
 * env: ANTHROPIC_API_KEY และ/หรือ OPENAI_API_KEY, ANTHROPIC_MODEL / OPENAI_MODEL (ไม่บังคับ)
 */

interface Provider {
  label: string;
  run<T>(schema: z.ZodType<T>, name: string, system: string, user: string, maxTokens: number): Promise<{ data: T; usage: string }>;
}

function anthropicProvider(): Provider {
  // จำกัดเวลาต่อการเรียก — ค่าเริ่มต้นของ SDK (10 นาที + retry) นานกว่าที่หน้า admin ถือว่ารอบตรวจค้าง (15 นาที)
  const client = new Anthropic({ timeout: 180_000, maxRetries: 1 });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  return {
    label: `Claude (${model})`,
    async run(schema, _name, system, user, maxTokens) {
      const response = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (response.stop_reason !== "end_turn" || !response.parsed_output) throw new Error(`unexpected stop_reason=${response.stop_reason}`);
      return { data: response.parsed_output, usage: `in ${response.usage.input_tokens} / out ${response.usage.output_tokens} tokens` };
    },
  };
}

function openaiProvider(): Provider {
  const client = new OpenAI({ timeout: 180_000, maxRetries: 1 });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  // reasoning ใช้ได้เฉพาะโมเดลตระกูล gpt-5 / o-series ส่งให้รุ่นอื่นจะได้ 400
  const reasoning = /^(gpt-5|o\d)/.test(model) ? { reasoning: { effort: "low" as const } } : {};
  return {
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
      if (response.status !== "completed" || !response.output_parsed) {
        throw new Error(`status=${response.status} ${response.incomplete_details?.reason ?? ""}`);
      }
      return { data: response.output_parsed as never, usage: `in ${response.usage?.input_tokens} / out ${response.usage?.output_tokens} tokens` };
    },
  };
}

/** ข้อความจาก API error ของทั้งสองเจ้า (Anthropic ซ้อน error.error.message, OpenAI ใช้ error.message) แทน JSON ดิบทั้งก้อน */
function apiErrorMessage(err: unknown): string {
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
  maxTokens = 8000,
): Promise<{ data: T; usage: string; label: string; failures: string[] }> {
  const providers = [
    ...(process.env.ANTHROPIC_API_KEY ? [anthropicProvider()] : []),
    ...(process.env.OPENAI_API_KEY ? [openaiProvider()] : []),
  ];
  if (providers.length === 0) throw new Error("ไม่มี API key ของ AI (ANTHROPIC_API_KEY หรือ OPENAI_API_KEY)");
  const failures: string[] = [];
  for (const p of providers) {
    try {
      const { data, usage } = await p.run(schema, name, system, user, maxTokens);
      return { data, usage, label: p.label, failures };
    } catch (err) {
      failures.push(`${p.label}: ${apiErrorMessage(err)}`.slice(0, 300));
    }
  }
  throw new Error(failures.join(" · "));
}
