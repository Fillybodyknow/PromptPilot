import Link from "next/link";
import { getAllCategoriesWithEntries, getCategoriesGrouped } from "@/lib/data";
import { getGroupAccent } from "@/lib/groupAccent";
import { PhotoAuroraBackground } from "@/components/PhotoAuroraBackground";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { VendorLogo } from "@/components/VendorLogo";

// One flagship tool per group (matches the 7 groups in the Categories section
// below) — ids/summaries are pulled from the real src/data/*.json entries, not
// invented, so this stays true if those entries change name/vendor later.
const SPOTLIGHT = [
  {
    categoryKey: "general-assistant",
    id: "claude-opus-5",
    name: "Claude Opus 5",
    vendor: "Anthropic",
    summary:
      "นำ benchmark ภาพรวมและงาน agentic ระยะยาว เหมาะกับกลุ่มผู้ใช้ที่งานหนึ่งชิ้นมีมูลค่าสูง",
  },
  {
    categoryKey: "business-writing",
    id: "m365-copilot-word",
    name: "Microsoft 365 Copilot",
    vendor: "Microsoft",
    summary:
      "ฝังอยู่ใน Word, Excel, PowerPoint, Outlook และ Teams เข้าถึงเอกสารในองค์กรได้โดยตรง",
  },
  {
    categoryKey: "coding-tools",
    id: "github-copilot",
    name: "GitHub Copilot",
    vendor: "GitHub / Microsoft",
    summary:
      "แข็งที่สุดด้านการควบคุมระดับองค์กร มี IP indemnification และรวมเข้ากับ VS Code/JetBrains ได้ลึก",
  },
  {
    categoryKey: "data-analysis",
    id: "power-bi-copilot",
    name: "Power BI Copilot",
    vendor: "Microsoft",
    summary:
      "สร้างรายงาน/dashboard จากคำสั่งภาษาธรรมชาติ เขียน DAX ให้ และเคารพสิทธิ์การเข้าถึงเดิม",
  },
  {
    categoryKey: "image-gen",
    id: "midjourney-v8",
    name: "Midjourney V8.1",
    vendor: "Midjourney",
    summary: "ผู้เชี่ยวชาญด้านสุนทรียะ ให้ภาพที่มีความเป็นภาพยนตร์และดูตั้งใจจัดองค์ประกอบ",
  },
  {
    categoryKey: "meetings-transcription",
    id: "fireflies-ai",
    name: "Fireflies.ai",
    vendor: "Fireflies",
    summary:
      "ยืดหยุ่นที่สุดสำหรับทีมหลายภาษา เชื่อมกับ Salesforce, HubSpot, Slack และอื่นๆ ได้",
  },
  {
    categoryKey: "automation",
    id: "n8n",
    name: "n8n",
    vendor: "n8n GmbH",
    summary:
      "ตัวเดียวในสามแพลตฟอร์มหลักที่ self-host ได้จริง รันในองค์กรได้โดยไม่ต้องเปิดระบบออกอินเทอร์เน็ต",
  },
];

const FAQ = [
  {
    question: "ข้อมูลที่เราพิมพ์เข้า AI ถูกเอาไปเทรนโมเดลหรือเปล่า",
    answer: `ขึ้นกับว่าใช้บัญชีแบบไหน ไม่ใช่ขึ้นกับว่าใช้ยี่ห้อไหน

ถ้าใช้บัญชีองค์กรที่บริษัทจัดให้ (Team, Enterprise, Business หรือผ่าน API) ผู้ให้บริการหลักทุกรายระบุตรงกันว่าไม่นำข้อมูลไปเทรนโมเดล และผูกไว้ในสัญญา ไม่ใช่แค่คำสัญญาในหน้าเว็บ

ถ้าใช้บัญชีส่วนตัว เรื่องต่างออกไปโดยสิ้นเชิง แม้จะเป็นแผนที่เสียเงินก็ตาม — Anthropic เปลี่ยนนโยบายเมื่อสิงหาคม 2025 ให้บทสนทนาของผู้ใช้ทั่วไปถูกนำไปเทรนเว้นแต่จะเข้าไปกดปิดเอง และการปิดทีหลังไม่ลบข้อมูลที่ถูกนำไปเทรนไปแล้ว ส่วน Gemini แผนเสียเงินรายบุคคลก็ยังถูกปฏิบัติเหมือนบัญชีผู้บริโภค

สิ่งที่ต้องจำ: จ่ายเงินเองไม่ได้แปลว่าข้อมูลบริษัทปลอดภัยขึ้น สิ่งที่ทำให้ปลอดภัยคือสัญญาระหว่างบริษัทกับผู้ให้บริการ ซึ่งบัญชีส่วนตัวไม่มี

ทำไมจึงห้ามใช้บัญชีส่วนตัวกับงานบริษัท มีสามเหตุผล นอกจากเรื่องการเทรนโมเดลข้างต้น องค์กรยังไม่มีสัญญาประมวลผลข้อมูล (DPA) รองรับหากมีข้อมูลส่วนบุคคลอยู่ในบทสนทนา และเมื่อพนักงานลาออก ประวัติที่มีข้อมูลบริษัทยังอยู่ในบัญชีส่วนตัวของเขา บริษัทเข้าไปลบไม่ได้

ถ้ายังไม่มีบัญชีองค์กร ติดต่อ [ฝ่าย IT] เพื่อขอสิทธิ์ อย่าใช้บัญชีส่วนตัวไปก่อน`,
  },
  {
    question: "ใช้ AI ของต่างประเทศ ผิด PDPA หรือเปล่า",
    answer: `ไม่ผิดโดยตัวมันเอง PDPA ไม่ได้ห้ามการโอนข้อมูลส่วนบุคคลไปต่างประเทศ แต่กำหนดเงื่อนไขไว้ในมาตรา 28 และ 29 โดยหลักคือข้อมูลต้องได้รับการคุ้มครองเทียบเท่ากับอยู่ในประเทศไทย

เมื่อองค์กรใช้บริการ AI จากต่างประเทศ ข้อมูลจะถูกโอนออกนอกประเทศ สิ่งที่ต้องตรวจคือ ข้อมูลถูกเก็บและประมวลผลบนเซิร์ฟเวอร์ประเทศใด และประเทศปลายทางอยู่ในรายการรับรองความเพียงพอของ PDPC หรือไม่ ถ้าไม่อยู่ ก็ยังทำได้ผ่านกลไกอื่น เช่น ความยินยอมที่แจ้งชัดว่ามาตรฐานปลายทางไม่เพียงพอ หรือนโยบายคุ้มครองข้อมูลภายในเครือกิจการที่ผ่านการรับรองจากสำนักงาน

สิ่งที่พนักงานต้องทำจริง ๆ ไม่ใช่ไปตรวจสามข้อข้างบนเอง นั่นเป็นงานของฝ่ายที่จัดหาเครื่องมือ สิ่งที่พนักงานต้องทำคือ ใช้เฉพาะเครื่องมือที่บริษัทอนุมัติแล้ว และปิดบังชื่อ เลขบัตร ที่อยู่ และข้อมูลลูกค้าก่อนป้อนเข้าไปเสมอ`,
  },
  {
    question: "ถ้า AI ให้ข้อมูลผิดแล้วเกิดความเสียหาย ใครรับผิดชอบ",
    answer: `องค์กรรับผิดชอบ ไม่ใช่ผู้ให้บริการ AI และไม่ใช่ตัว AI

ในทางกฎหมาย AI เป็นเพียงเครื่องมือ ไม่มีสถานะทางกฎหมายที่จะรับผิดได้ องค์กรที่นำ AI มาใช้อยู่ในฐานะผู้ควบคุมข้อมูล (Data Controller) และรับผิดชอบสูงสุด ส่วนผู้ให้บริการโมเดลเป็นเพียงผู้ประมวลผล (Data Processor)

ในทางปฏิบัติสำหรับพนักงาน แปลว่า งานที่ AI ช่วยทำ ยังเป็นงานของคุณ ถ้าคุณส่งเอกสารที่ AI ร่างให้ออกไปโดยไม่ได้อ่าน แล้วในนั้นมีตัวเลขผิด นั่นคือความผิดของคุณ ไม่ใช่ของ AI การตรวจก่อนส่งจึงไม่ใช่คำแนะนำ แต่เป็นขั้นตอนที่ละเว้นไม่ได้

จุดที่พลาดบ่อยที่สุด: AI มักเติมตัวเลข วันที่ หรือชื่อที่ฟังดูสมเหตุสมผลแต่ไม่มีอยู่จริง ให้ตรวจตัวเลขทุกตัวในงานที่ AI สร้าง โดยเฉพาะเมื่อคุณไม่ได้เป็นคนให้ตัวเลขนั้นไปตั้งแต่แรก`,
  },
  {
    question: "ตกลง AI ตัวไหนเก่งที่สุด",
    answer: `เป็นคำถามที่ตอบได้ แต่ตอบแล้วไม่ช่วยอะไร

ช่องว่างระหว่างโมเดลอันดับ 1 ถึง 4 อยู่ที่ราว 2 จุดจาก 100 ในดัชนีวัดของ Artificial Analysis ซึ่งเป็นระยะห่างที่ผู้ใช้ทั่วไปแยกไม่ออกในการใช้งานจริง เช่นเดียวกับงานเขียนโค้ดที่อันดับ 1 ถึง 3 ห่างกันไม่ถึง 1.5 จุด

สิ่งที่ทำให้ผลลัพธ์ต่างกันจริง เรียงตามน้ำหนัก คือ (1) เครื่องมืออยู่ตรงที่คุณทำงานอยู่แล้วหรือไม่ (2) ข้อมูลที่ต้องป้อนเข้าไปออกนอกองค์กรได้หรือไม่ (3) คุณเขียนคำสั่งและแนบเอกสารอ้างอิงดีแค่ไหน แล้วค่อยเป็นคะแนน benchmark

มีข้อมูลที่ยืนยันเรื่องนี้ชัดเจน — จากการสำรวจผู้ใช้ในองค์กรกว่า 150,000 คน เมื่อพนักงานมีทั้งสามแพลตฟอร์มให้เลือก 70% เลือก ChatGPT เป็นเครื่องมือหลัก ไม่ใช่เพราะคะแนนสูงสุด แต่เพราะคุ้นเคยที่สุด

แทนที่จะถามว่าตัวไหนเก่งที่สุด ให้เลือกจากหมวดงานที่คุณทำ แต่ละหมวดมีคำตอบคนละตัว`,
  },
  {
    question: "AI ใช้ภาษาไทยได้ดีแค่ไหน",
    answer: `ดีกว่าที่หลายคนคิดสำหรับงานเขียนและสนทนา แต่มีสามจุดที่ต้องระวังเป็นพิเศษ

โมเดลระดับแนวหน้าทุกตัวใช้ภาษาไทยได้ดีในงานเขียน สรุป และถามตอบ และยังมีโมเดลที่สร้างมาเพื่อภาษาไทยโดยเฉพาะคือ Typhoon จาก SCB 10X ที่ทำคะแนน Thai IFEval ได้ 83.0 ซึ่งดีที่สุดในคลาส และดาวน์โหลดไปรันในองค์กรได้ฟรี

สามจุดที่ยังไม่มีใครวัดไว้ ต้องทดสอบเอง:

การถอดเสียงประชุมภาษาไทย — ไม่มีตัวเลขความแม่นยำภาษาไทยจากแหล่งใดเลย และเครื่องมือที่บทความต่างประเทศแนะนำบ่อยที่สุดอย่าง Otter.ai ทำงานได้ดีจริงเพียง 3 ภาษา
ตัวอักษรไทยในภาพที่ AI สร้าง — การวัดความสามารถด้านตัวอักษรทั้งหมดวัดภาษาอังกฤษ วิธีที่ปลอดภัยคือให้ AI สร้างภาพพื้นหลัง แล้วใส่ข้อความไทยทับด้วย Canva หรือ Figma
ข้อความไทยยาวกว่าอังกฤษราว 20-30% — ดีไซน์หรือสไลด์ที่ AI สร้างมาพอดีในภาษาอังกฤษ มักล้นกรอบเมื่อใส่ข้อความไทย

ข้อควรระวังที่ใช้ได้กับทุกงาน: เมื่อถามคำถามที่ต้องใช้ข้อมูลเฉพาะไทย AI มักหยิบข้อมูลจากอเมริกาหรือยุโรปมาตอบโดยไม่บอก ให้เขียนกำกับในคำถามเสมอว่า "ถ้าไม่มีข้อมูลของไทย ให้ระบุว่าใช้ข้อมูลจากที่ไหนแทน"`,
  },
  {
    question: "ถ้าองค์กรไม่ต้องการให้ข้อมูลออกนอกเลย ยังใช้ AI ได้ไหม",
    answer: `ได้ และไม่จำเป็นต้องมีงบมหาศาล

แนวทางคือใช้โมเดลแบบ open-weight ที่รันบนเซิร์ฟเวอร์ขององค์กรเอง ข้อมูลไม่ออกจากระบบเลย ตัวเลือกที่เหมาะกับองค์กรไทยที่สุดคือ Typhoon 2.5 30B A3B ซึ่งเป็นโมเดลสองภาษาไทย-อังกฤษ ดาวน์โหลดฟรี และมีสถาปัตยกรรมที่ทำงานจริงเพียง 3B พารามิเตอร์ จึงกินทรัพยากรน้อยกว่าที่ขนาดบอก

สิ่งที่ต้องเตรียมคือเครื่องที่มี GPU และคนดูแล ไม่ใช่ค่าลิขสิทธิ์ สำหรับทดลอง Ollama ก็พอ แต่สำหรับใช้งานจริงที่มีคนใช้พร้อมกันต้องเปลี่ยนไปใช้ vLLM — ผลทดสอบของ Red Hat วัดได้ 793 ครั้งต่อวินาทีบน vLLM เทียบกับ 41 บน Ollama ภายใต้โหลดพร้อมกัน

จุดที่พลาดกันบ่อยที่สุด: การรันระบบเองอย่างเดียวไม่พอ ถ้าระบบนั้นยังเรียก API ของผู้ให้บริการภายนอกอยู่ ข้อมูลก็ออกนอกองค์กรอยู่ดี ต้องชี้ทุกจุดที่เรียกใช้ AI ไปที่โมเดลภายในจึงจะปิดวงจรได้จริง`,
  },
];

// Each benefit gets its own hue (icon chip + hover border) instead of a single
// repeated indigo/fuchsia treatment — full class strings are literal so Tailwind's
// scanner can find and generate them.
const BENEFITS = [
  {
    icon: "⚡",
    title: "เพิ่มประสิทธิภาพการทำงาน",
    description: "ลดเวลาทำงานซ้ำๆ ให้ทีมโฟกัสงานที่สร้างมูลค่าได้มากขึ้น",
    chip: "bg-gradient-to-br from-amber-500/25 to-amber-600/10",
    hoverBorder: "hover:border-amber-400/30",
  },
  {
    icon: "💰",
    title: "ลดต้นทุนดำเนินงาน",
    description: "อัตโนมัติงานที่ใช้แรงงาน/เวลามาก ลดค่าใช้จ่ายในระยะยาว",
    chip: "bg-gradient-to-br from-emerald-500/25 to-emerald-600/10",
    hoverBorder: "hover:border-emerald-400/30",
  },
  {
    icon: "🎯",
    title: "ตัดสินใจแม่นยำขึ้น",
    description: "วิเคราะห์ข้อมูลจำนวนมากได้เร็ว ช่วยตัดสินใจบนพื้นฐานข้อมูลจริง",
    chip: "bg-gradient-to-br from-sky-500/25 to-sky-600/10",
    hoverBorder: "hover:border-sky-400/30",
  },
  {
    icon: "🚀",
    title: "เพิ่มความได้เปรียบทางการแข่งขัน",
    description: "องค์กรที่ปรับใช้ AI เร็วมักตอบสนองตลาดและลูกค้าได้ไวกว่าคู่แข่ง",
    chip: "bg-gradient-to-br from-fuchsia-500/25 to-fuchsia-600/10",
    hoverBorder: "hover:border-fuchsia-400/30",
  },
  {
    icon: "🧠",
    title: "ปลดปล่อยศักยภาพพนักงาน",
    description: "ให้ AI ช่วยงานซ้ำซาก พนักงานมีเวลาคิดงานเชิงกลยุทธ์มากขึ้น",
    chip: "bg-gradient-to-br from-violet-500/25 to-violet-600/10",
    hoverBorder: "hover:border-violet-400/30",
  },
  {
    icon: "🤝",
    title: "ยกระดับประสบการณ์ลูกค้า",
    description: "ตอบสนองลูกค้าได้เร็วและตรงจุดขึ้นด้วยผู้ช่วย AI",
    chip: "bg-gradient-to-br from-rose-500/25 to-rose-600/10",
    hoverBorder: "hover:border-rose-400/30",
  },
];

export default function MainPage() {
  const categories = getAllCategoriesWithEntries();
  const groups = getCategoriesGrouped();
  const totalTools = categories.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <PhotoAuroraBackground />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            🤖 ยุคที่ AI เปลี่ยนวิธีทำงานขององค์กรทั่วโลก
          </span>
          <h1
            className="animate-fade-up mt-6 text-4xl leading-tight font-semibold tracking-tight text-neutral-50 sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            ปลดล็อกศักยภาพองค์กร
            <br />
            ด้วย <span className="text-gradient">AI</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-balance text-lg text-neutral-400"
            style={{ animationDelay: "160ms" }}
          >
            คู่มือเลือกและใช้ AI ที่จำเป็นในองค์กร ครบทั้งวิธีใช้งาน การเขียน prompt
            ที่ได้ผลจริง (มีหลักฐาน) และวิธีติดตั้ง/เข้าถึง — สำหรับองค์กรไทยที่พร้อมก้าวสู่ยุค AI
          </p>
          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/explore"
              className="rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-105 hover:shadow-indigo-500/40"
            >
              เริ่มสำรวจหมวดหมู่ AI →
            </Link>
          </div>

          <div
            className="animate-fade-up mx-auto mt-16 flex max-w-lg items-center justify-center gap-10 text-sm"
            style={{ animationDelay: "320ms" }}
          >
            <div>
              <div className="text-3xl font-semibold text-neutral-50">
                <AnimatedCounter target={groups.length} />
              </div>
              <div className="mt-1 text-neutral-500">กลุ่มงาน</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <div className="text-3xl font-semibold text-neutral-50">
                <AnimatedCounter target={categories.length} />
              </div>
              <div className="mt-1 text-neutral-500">หมวดหมู่</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <div className="text-3xl font-semibold text-neutral-50">
                <AnimatedCounter target={totalTools} />
              </div>
              <div className="mt-1 text-neutral-500">เครื่องมือ</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase light:text-indigo-600">
            ทำไมองค์กรต้องใช้ AI
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl light:text-neutral-900">
            ประโยชน์ที่จับต้องได้จริง
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06] light:border-black/10 light:bg-black/[0.02] light:hover:bg-black/[0.04] ${benefit.hoverBorder}`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-transform group-hover:scale-110 ${benefit.chip}`}
              >
                {benefit.icon}
              </div>
              <h3 className="mt-4 font-medium text-neutral-100 light:text-neutral-900">
                {benefit.title}
              </h3>
              <p className="mt-1.5 text-sm text-neutral-400 light:text-neutral-600">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories — real content preview so visitors see what's inside before
          clicking through, instead of only abstract benefit copy. Full-bleed tinted
          band (alternates with Trusted-by further down) so this and the plain-black
          Benefits/Spotlight sections don't read as one long black slab. */}
      <section className="border-y border-white/5 bg-white/[0.06] light:border-black/5 light:bg-black/[0.035]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase light:text-indigo-600">
              ครอบคลุมทุกงานในองค์กร
            </h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl light:text-neutral-900">
              {groups.length} กลุ่มงาน {categories.length} หมวดหมู่
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {groups.map((group) => {
              const accent = getGroupAccent(group.group);
              return (
                <div
                  key={group.group}
                  className={`w-full rounded-2xl border border-white/10 bg-white/[0.08] p-6 transition hover:-translate-y-1 hover:bg-white/[0.12] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] light:border-black/10 light:bg-black/[0.045] light:hover:bg-black/[0.07] ${accent.hoverBorder}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      {accent.icon}
                    </span>
                    <h3 className="font-medium text-neutral-100 light:text-neutral-900">
                      {group.group}
                    </h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {group.categories.map((category) => (
                      <Link
                        key={category.key}
                        href={`/explore/${category.key}`}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${accent.badge}`}
                      >
                        {category.titleTh}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Spotlight — one flagship tool per group, with its real vendor logo, so
          visitors see actual tools (not just category labels) before clicking through. */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase light:text-indigo-600">
            ตัวอย่างเครื่องมือ
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl light:text-neutral-900">
            เครื่องมือเด่นในแต่ละกลุ่มงาน
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {SPOTLIGHT.map((tool) => {
            const category = categories.find((c) => c.key === tool.categoryKey);
            const accent = getGroupAccent(category?.group ?? "");
            return (
              <Link
                key={tool.id}
                href={`/explore/${tool.categoryKey}`}
                className={`w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] light:border-black/10 light:bg-black/[0.02] light:hover:bg-black/[0.04] ${accent.hoverBorder}`}
              >
                <div className="flex items-center gap-3">
                  <VendorLogo vendor={tool.vendor} size={36} />
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-neutral-100 light:text-neutral-900">
                      {tool.name}
                    </h3>
                    <p className="truncate text-xs text-neutral-500">{tool.vendor}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-neutral-400 light:text-neutral-600">
                  {tool.summary}
                </p>
                {category ? (
                  <span
                    className={`mt-4 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${accent.badge}`}
                  >
                    <span aria-hidden>{accent.icon}</span>
                    {category.titleTh}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      {/* FAQ — tinted band, alternates with Categories above (Benefits/Spotlight
          stay plain). border-t only (not border-y) since the CTA section right
          below already adds its own border-t, and doubling them up would look
          like a seam. */}
      <section className="border-t border-white/5 bg-white/[0.06] light:border-black/5 light:bg-black/[0.035]">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase light:text-indigo-600">
              คำถามที่พบบ่อย
            </h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl light:text-neutral-900">
              ยังมีคำถามอยู่ใช่ไหม
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 light:border-black/10 light:bg-black/[0.045]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-neutral-100 marker:content-none [&::-webkit-details-marker]:hidden light:text-neutral-900">
                  {item.question}
                  <span
                    className="shrink-0 text-lg text-neutral-500 transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-neutral-400 light:text-neutral-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/10">
        <PhotoAuroraBackground
          objectPositionClassName="object-[center_30%]"
          topFadeHeightClassName="h-3 sm:h-5"
          bottomFadeHeightClassName="h-0"
        />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-20">
          <p className="text-2xl font-semibold text-neutral-50 sm:text-3xl">
            พร้อมเริ่มใช้ AI ในองค์กรของคุณแล้วหรือยัง?
          </p>
          <p className="mx-auto mt-3 max-w-md text-neutral-400">
            สำรวจหมวดหมู่ AI ที่จำเป็นในองค์กร พร้อมวิธีใช้งานและติดตั้งแบบละเอียด
          </p>
          <Link
            href="/explore"
            className="mt-7 inline-block rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-105 hover:shadow-indigo-500/40"
          >
            สำรวจหมวดหมู่ AI ทั้งหมด →
          </Link>
        </div>
      </section>
    </>
  );
}
