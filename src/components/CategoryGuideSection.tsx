import type { CategoryGuide } from "@/lib/schema";

const ACCESS_METHOD_LABEL: Record<string, string> = {
  web: "ใช้ผ่านเว็บ ไม่ต้องติดตั้ง",
  "browser-extension": "Browser Extension",
  "desktop-installer": "ติดตั้งโปรแกรมบนเครื่อง",
  cli: "เครื่องมือบรรทัดคำสั่ง (CLI)",
  "self-hosted": "ต้องมี IT รันเซิร์ฟเวอร์เอง",
  "sso-license": "ต้องขอ license ผ่าน SSO องค์กร",
};

export function CategoryGuideSection({ guide }: { guide: CategoryGuide }) {
  return (
    <section className="mb-10 space-y-8">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="mb-2 text-lg font-medium text-neutral-100">วิธีใช้งาน</h2>
        <p className="text-sm leading-relaxed text-neutral-300">{guide.howToUse}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="mb-3 text-lg font-medium text-neutral-100">วิธีเข้าถึง/ติดตั้ง</h2>
        <span className="inline-block rounded px-2 py-0.5 text-xs ring-1 ring-inset ring-neutral-700 text-neutral-400">
          {ACCESS_METHOD_LABEL[guide.accessMethod] ?? guide.accessMethod}
        </span>
        {guide.links && guide.links.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        ) : null}
        {guide.installSteps && guide.installSteps.length > 0 ? (
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-neutral-300">
            {guide.installSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-5">
        <h2 className="mb-2 text-lg font-medium text-amber-200">⚠️ ข้อควรระวังเรื่องข้อมูล</h2>
        <p className="text-sm leading-relaxed text-amber-300/90">{guide.dataHandlingNote}</p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-medium text-neutral-100">การเขียน Prompt ที่ได้ผล</h2>
        <p className="mb-4 text-xs text-neutral-500">
          ตัวอย่างที่มีป้าย <span className="text-amber-400">⚠️ ยังไม่ทดสอบผลจริง</span> เขียนจากหลักการ
          prompt engineering ทั่วไป ยังไม่ได้ลองรันจริงกับโมเดล — ควรทดสอบกับงานจริงก่อนแนะนำใช้งานเป็นวงกว้าง
        </p>
        <div className="space-y-6">
          {guide.promptTemplates.map((template, i) => (
            <div key={i} className="rounded-lg border border-neutral-800 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-neutral-100">{template.task}</h3>
                {template.tested ? (
                  <span
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ring-1 ring-inset ring-emerald-800 bg-emerald-950/40 text-emerald-300"
                    title={`ทดสอบล่าสุด ${template.testedAt} กับ ${template.testedWith?.join(", ")}`}
                  >
                    ✅ ทดสอบแล้ว · {template.testedAt}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ring-1 ring-inset ring-amber-800 bg-amber-950/40 text-amber-300">
                    ⚠️ ยังไม่ทดสอบผลจริง
                  </span>
                )}
              </div>

              {template.tested && template.testedWith?.length ? (
                <p className="mb-3 text-xs text-neutral-500">
                  ทดสอบกับ: {template.testedWith.join(", ")}
                </p>
              ) : null}

              {template.badPrompt ? (
                <div className="mb-3">
                  <span className="mb-1 inline-block text-xs font-medium text-red-400">
                    ✗ ไม่ควรเขียนแบบนี้
                  </span>
                  <p className="rounded border border-red-950 bg-red-950/20 px-3 py-2 text-sm text-red-300/80">
                    {template.badPrompt}
                  </p>
                </div>
              ) : null}

              <div className="mb-3">
                <span className="mb-1 inline-block text-xs font-medium text-emerald-400">
                  ✓ ใช้แบบนี้แทน
                </span>
                <p className="whitespace-pre-wrap rounded border border-emerald-950 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300/90">
                  {template.goodPrompt}
                </p>
              </div>

              <p className="text-xs leading-relaxed text-neutral-500">
                <span className="font-medium text-neutral-400">ทำไมถึงได้ผล: </span>
                {template.why}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
