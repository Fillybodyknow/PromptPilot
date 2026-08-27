/** Slow-drifting blurred gradient blobs — the "AI era" glow behind hero sections. */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-aurora-1 absolute -top-32 -left-32 h-[32rem] w-[32rem] rounded-full bg-indigo-600/30 blur-[110px]" />
      <div className="animate-aurora-2 absolute -right-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/25 blur-[110px]" />
      <div className="animate-aurora-1 absolute bottom-0 left-1/3 h-[26rem] w-[26rem] rounded-full bg-violet-600/20 blur-[110px]" />
      <div className="animate-aurora-2 absolute top-1/3 -right-16 h-[22rem] w-[22rem] rounded-full bg-cyan-500/20 blur-[110px]" />
      <div className="animate-aurora-1 absolute -bottom-24 right-1/4 h-[24rem] w-[24rem] rounded-full bg-amber-500/15 blur-[110px]" />
    </div>
  );
}
