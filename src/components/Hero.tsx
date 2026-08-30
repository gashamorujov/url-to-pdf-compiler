export function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pt-10 pb-2 text-center sm:pt-14 sm:pb-4">
      <h2
        className="text-5xl font-black uppercase leading-none tracking-tight text-transparent sm:text-7xl md:text-8xl"
        style={{
          backgroundImage: 'linear-gradient(100deg, #4f46e5, #7c3aed 45%, #0891b2)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        By OG
      </h2>

      <div className="mx-auto mt-6 flex max-w-md items-center gap-3 sm:mt-8">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-indigo-400/60 dark:to-indigo-500/60" />
        <span className="text-indigo-400 dark:text-indigo-500">✦</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-indigo-400/60 dark:to-indigo-500/60" />
      </div>

      <p
        className="glitch-rare mx-auto mt-6 max-w-2xl text-base font-bold uppercase leading-relaxed tracking-[0.12em] text-black sm:text-xl md:text-2xl dark:text-gray-100"
        data-text="The life is not fair, you should not be a fair"
      >
        The life is not fair, you should not be a fair
      </p>

      <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-gray-400 sm:text-xs dark:text-gray-500">
        Paste image URLs → sorted preview → one PDF
      </p>
    </section>
  );
}
