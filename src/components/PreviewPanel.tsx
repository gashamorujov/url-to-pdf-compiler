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
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold">Preview ({loaded.length} / {total})</h2>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {(['grid', 'list'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                mode === m ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
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
            <div key={entry.id} className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
              <div className="relative aspect-[3/4] w-full bg-gray-100 dark:bg-gray-800">
                {entry.objectUrl ? (
                  <img src={entry.objectUrl} alt={`Page ${entry.pageNumber ?? index + 1}`} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    {entry.status === 'loading' ? (
                      <svg className="h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : entry.status === 'error' ? (
                      <span title={entry.error}>⚠️ Error</span>
                    ) : (
                      '—'
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {entry.pageNumber !== null ? `Page ${entry.pageNumber}` : `#${index + 1}`}
                </span>
                <span className={`text-[10px] font-medium ${entry.status === 'error' ? 'text-rose-500' : entry.status === 'loaded' ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {entries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950">
              <span className="w-12 text-center text-xs font-semibold text-gray-500">{entry.pageNumber !== null ? entry.pageNumber : index + 1}</span>
              <div className="h-14 w-10 flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800">
                {entry.objectUrl ? (
                  <img src={entry.objectUrl} alt="" className="h-full w-full rounded object-cover" loading="lazy" />
                ) : null}
              </div>
              <div className="flex-1 truncate font-mono text-xs text-gray-600 dark:text-gray-400" title={entry.url}>{entry.url}</div>
              <span className={`text-[10px] font-medium ${entry.status === 'error' ? 'text-rose-500' : entry.status === 'loaded' ? 'text-emerald-600' : 'text-gray-400'}`}>
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
