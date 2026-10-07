import { card } from "@/components/site/ui";

/** โครงหน้าระหว่างรอข้อมูลจาก DB — ทรงเดียวกับหน้าที่มี banner + การ์ด จะได้ไม่กระตุกตอนเนื้อหามาแทน */
export default function Loading() {
  const bar = "skeleton rounded-lg";
  return (
    <div role="status" aria-live="polite" aria-label="กำลังโหลด">
      <div className="bg-[#0c0d11]">
        <div className="mx-auto flex min-h-[260px] max-w-6xl flex-col justify-end gap-3 px-4 pb-10 pt-10 opacity-40 sm:min-h-[300px] sm:px-6">
          <div className={`${bar} h-4 w-40`} />
          <div className={`${bar} h-11 w-full max-w-xl`} />
          <div className={`${bar} h-5 w-full max-w-2xl`} />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`${card} flex min-w-0 flex-[1_1_300px] flex-col gap-3 p-5`}>
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className={`${bar} h-4 w-2/3`} />
                  <div className={`${bar} h-3 w-1/3`} />
                </div>
              </div>
              <div className={`${bar} h-3 w-full`} />
              <div className={`${bar} h-3 w-5/6`} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">กำลังโหลด…</span>
    </div>
  );
}
