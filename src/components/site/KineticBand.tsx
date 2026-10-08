/** แถบตัวอักษรใหญ่สองแถวที่เลื่อนสวนกันตามการ scroll (ตกแต่งล้วน — screen reader ข้าม) ดู .kinetic-* ใน globals.css */
export function KineticBand({ words }: { words: string[] }) {
  const line = Array.from({ length: 4 }, () => words.join(" · ")).join(" · ") + " ·";
  return (
    <div aria-hidden className="kinetic pointer-events-none relative my-16 w-full select-none overflow-hidden py-2">
      <div className="kinetic-left whitespace-nowrap text-[clamp(44px,8vw,112px)] font-bold leading-[1.15] text-outline">{line}</div>
      <div className="kinetic-right whitespace-nowrap bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-[clamp(44px,8vw,112px)] font-bold leading-[1.15] text-transparent">
        {line}
      </div>
    </div>
  );
}
