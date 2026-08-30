import type { UrlEntry } from '../types';

interface UrlTableProps {
  entries: UrlEntry[];
  onLoadProgress: { done: number; total: number } | null;
  previewOpen: boolean;
  previewMode: 'grid' | 'list';
  onTogglePreview: () => void;
  onModeChange: (mode: 'grid' | 'list') => void;
  concurrency: number;
  onConcurrencyChange: (value: number) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onRetryAllFailed: () => void;
  onClearAll: () => void;
  onExportTxt: () => void;
  onExportCsv: () => void;
}

function StatusBadge({ status, error }: { status: UrlEntry['status']; error?: string }) {
  const styles = {
    pending: 'border-cyan-500/30 text-cyan-400/70',
    loading: 'border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.35)]',
    loaded: 'border-emerald-400/60 text-emerald-300 shadow-[0_0_12px_rgba(16,255,160,0.25)]',
    error: 'border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(255,0,80,0.25)]',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded border bg-black/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${styles[status]}`} title={error}>
      {status === 'loading' && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {status === 'loaded' && <span aria-hidden>✓</span>}
      {status === 'error' && <span aria-hidden>✗</span>}
      {status === 'loading' ? 'Loading' : status.charAt(0).toUpperCase() + status.slice(1)}
      {status === 'error' && error && <span className="ml-0.5 max-w-[120px] truncate opacity-80">({error})</span>}
    </span>
  );
}

export function UrlTable({
  entries,
  onLoadProgress,
  onConcurrencyChange,
  concurrency,
  onDelete,
  onRetry,
  onRetryAllFailed,
  onClearAll,
  onExportTxt,
  onExportCsv,
}: UrlTableProps) {
  const loadedCount = entries.filter((e) => e.status === 'loaded').length;
  const failedCount = entries.filter((e) => e.status === 'error').length;
  const showProgress = onLoadProgress !== null && onLoadProgress.done < onLoadProgress.total;

  return (
    <section className="cyber-panel relative overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
        <span className="text-xs uppercase tracking-widest text-cyan-400">
          {entries.length} URLs · {loadedCount} loaded{failedCount > 0 ? ` · ${failedCount} failed` : ''}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs uppercase tracking-widest text-cyan-500/70">
          Concurrency:
          <select
            value={concurrency}
            onChange={(event) => onConcurrencyChange(Number(event.target.value))}
            className="rounded border border-cyan-500/40 bg-[#070a18] px-1 py-0.5 text-xs text-cyan-200 outline-none focus:border-cyan-400"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </span>
      </div>

      {showProgress && (
        <div className="border-b border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
          <div className="mb-1 flex justify-between uppercase tracking-widest">
            <span>Loading images…</span>
            <span>{onLoadProgress!.done} / {onLoadProgress!.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-cyan-500/20">
            <div
              className="h-full rounded-full bg-cyan-400 shadow-[0_0_12px_#00e5ff] transition-all duration-300"
              style={{ width: `${(onLoadProgress!.done / onLoadProgress!.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-cyan-500/20 px-4 py-3">
        {failedCount > 0 && (
          <button onClick={onRetryAllFailed} className="cyber-btn cyber-btn-danger py-1.5 text-xs">
            Retry Failed ({failedCount})
          </button>
        )}
        <button onClick={onClearAll} className="cyber-btn cyber-btn-ghost py-1.5 text-xs">Clear All</button>
        <button onClick={onExportTxt} className="cyber-btn cyber-btn-ghost py-1.5 text-xs">Export TXT</button>
        <button onClick={onExportCsv} className="cyber-btn cyber-btn-ghost py-1.5 text-xs">Export CSV</button>
      </div>

      <div className="overflow-x-auto">
        <table className="cyber-table w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Page</th>
              <th>URL</th>
              <th>Status</th>
              <th>Preview</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} className="text-cyan-100/80 transition hover:bg-cyan-500/5">
                <td className="border-b border-cyan-500/10 px-4 py-2 text-cyan-500/80">{index + 1}</td>
                <td className="border-b border-cyan-500/10 px-4 py-2 font-bold tabular-nums text-cyan-300">{entry.pageNumber ?? '—'}</td>
                <td className="max-w-[280px] truncate border-b border-cyan-500/10 px-4 py-2 font-mono text-xs text-cyan-100/60" title={entry.url}>{entry.url}</td>
                <td className="border-b border-cyan-500/10 px-4 py-2"><StatusBadge status={entry.status} error={entry.error} /></td>
                <td className="border-b border-cyan-500/10 px-4 py-2">
                  {entry.objectUrl ? (
                    <img src={entry.objectUrl} alt={`Page ${entry.pageNumber ?? index + 1}`} className="h-10 w-14 rounded border border-cyan-500/30 object-cover" loading="lazy" />
                  ) : (
                    <span className="text-cyan-500/30">—</span>
                  )}
                </td>
                <td className="border-b border-cyan-500/10 px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => onDelete(entry.id)} className="rounded px-2 py-1 text-sm text-cyan-500/70 transition hover:bg-rose-500/10 hover:text-rose-400" title="Delete">🗑</button>
                    {entry.status === 'error' && (
                      <button onClick={() => onRetry(entry.id)} className="rounded px-2 py-1 text-sm text-cyan-500/70 transition hover:bg-amber-500/10 hover:text-amber-400" title="Retry">🔄</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
