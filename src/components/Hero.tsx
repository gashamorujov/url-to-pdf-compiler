export function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-4xl px-4 py-10 text-center sm:py-16">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_#00e5ff]" />
        System Online
      </div>

      <h2 className="font-display text-6xl font-black uppercase leading-none tracking-tight text-transparent sm:text-8xl md:text-9xl"
        style={{
          backgroundImage: 'linear-gradient(90deg, #00e5ff, #40ffc0, #ff00a0)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 18px rgba(0,229,255,0.45))',
        }}>
        By OG
      </h2>

      <div className="mx-auto my-6 flex max-w-md items-center gap-3 sm:my-8">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500/60" />
        <span className="text-cyan-400">◆</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-500/60" />
      </div>

      <p className="font-display mx-auto max-w-2xl text-lg font-bold uppercase leading-relaxed tracking-[0.15em] text-cyan-100 sm:text-2xl md:text-3xl">
        The life is <span className="glow-magenta text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#ff00a0,#ff6ec7)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>not fair</span>,<br className="sm:hidden" />
        <span className="glow-cyan"> you should not be a fair</span>
      </p>

      <p className="mt-8 text-xs uppercase tracking-[0.35em] text-cyan-500/70 sm:text-sm">
        Bulk image URLs → one PDF
      </p>
    </section>
  );
}
