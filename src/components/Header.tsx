interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="relative z-10 border-b border-cyan-500/20 bg-[#05060f]/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded border border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_14px_rgba(0,229,255,0.3)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 3h10l2 4v4M7 3l-2 4v4m2-4h10m0 0v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1 className="font-display text-base font-bold uppercase tracking-wider text-cyan-200 glow-cyan">
              URL to PDF Compiler
            </h1>
            <p className="hidden text-[11px] uppercase tracking-[0.2em] text-cyan-500/70 sm:block">
              Bulk image URLs → sorted · previewed · merged
            </p>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/40 text-cyan-300 transition hover:border-cyan-400 hover:text-white hover:shadow-[0_0_14px_rgba(0,229,255,0.3)]"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
