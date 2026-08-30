import type { PreviewMode, UrlEntry } from '../types';

interface PreviewPanelProps {
  open: boolean;
  entries: UrlEntry[];
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}

export function PreviewPanel({ open, entries, mode, onModeChange }: PreviewPanelProps) {
  if (!open) return null;

  const loaded = entries.filter((entry) => entry.objectUrl);
  const total = entries.length;

  return (
    <section className="cyber-panel relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-cyan-300">
          Preview ({loaded.length} / {total})
        </h2>
        <div className="flex items-center gap-1 border border-cyan-500/30 p-0.5">
          {(['grid', 'list'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`font-display rounded px-3 py-1 text-xs font-bold uppercase tracking-widest transition ${
                mode === m ? 'bg-cyan-500/25 text-white shadow-[0_0_10px_rgba(0,229,255,0.35)]' : 'text-cyan-400/70 hover:text-cyan-200'
              }`}
            >
              {m === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((entry, index) => (
            <div key={entry.id} className="group relative flex flex-col overflow-hidden rounded border border-cyan-500/20 bg-[#070a18] transition hover:border-cyan-400/40 hover:shadow-[0_0_16px_rgba(0,229,255,0.15)]">
              <div className="relative aspect-[3/4] w-full bg-black/40">
                {entry.objectUrl ? (
                  <img src={entry.objectUrl} alt={`Page ${entry.pageNumber ?? index + 1}`} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-cyan-500/50">
                    {entry.status === 'loading' ? (
                      <svg className="h-6 w-6 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : entry.status === 'error' ? (
                      <span className="text-rose-400" title={entry.error}>⚠️ Error</span>
                    ) : (
                      '—'
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="font-display text-xs font-bold text-cyan-300">
                  {entry.pageNumber !== null ? `Page ${entry.pageNumber}` : `#${index + 1}`}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${entry.status === 'error' ? 'text-rose-400' : entry.status === 'loaded' ? 'text-emerald-400' : 'text-cyan-500/50'}`}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {entries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-3 rounded border border-cyan-500/20 bg-[#070a18] p-2 transition hover:border-cyan-400/40">
              <span className="font-display w-12 text-center text-xs font-bold text-cyan-400">{entry.pageNumber !== null ? entry.pageNumber : index + 1}</span>
              <div className="h-14 w-10 flex-shrink-0 rounded border border-cyan-500/20 bg-black/40">
                {entry.objectUrl ? <img src={entry.objectUrl} alt="" className="h-full w-full rounded object-cover" loading="lazy" /> : null}
              </div>
              <div className="flex-1 truncate font-mono text-xs text-cyan-100/60" title={entry.url}>{entry.url}</div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${entry.status === 'error' ? 'text-rose-400' : entry.status === 'loaded' ? 'text-emerald-400' : 'text-cyan-500/50'}`}>
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
