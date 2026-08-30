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
    pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    loading: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    loaded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`} title={error}>
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
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {entries.length} URL(s) · {loadedCount} loaded · {failedCount > 0 ? `${failedCount} failed` : ''}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          Concurrent:
          <select
            value={concurrency}
            onChange={(event) => onConcurrencyChange(Number(event.target.value))}
            className="rounded-md border border-gray-300 bg-white px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </span>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="bg-indigo-50 px-4 py-2 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          <div className="mb-1 flex justify-between">
            <span>Loading images…</span>
            <span>{onLoadProgress!.done} / {onLoadProgress!.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-indigo-200 dark:bg-indigo-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${(onLoadProgress!.done / onLoadProgress!.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {failedCount > 0 && (
          <button onClick={onRetryAllFailed} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-400">
            Retry Failed ({failedCount})
          </button>
        )}
        <button onClick={onClearAll} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
          Clear All
        </button>
        <button onClick={onExportTxt} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
          Export TXT
        </button>
        <button onClick={onExportCsv} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-t border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Page</th>
              <th className="px-4 py-2 font-medium">URL</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Preview</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                <td className="px-4 py-2 font-medium tabular-nums">{entry.pageNumber ?? '—'}</td>
                <td className="max-w-[280px] truncate px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400" title={entry.url}>
                  {entry.url}
                </td>
                <td className="px-4 py-2"><StatusBadge status={entry.status} error={entry.error} /></td>
                <td className="px-4 py-2">
                  {entry.objectUrl ? (
                    <img src={entry.objectUrl} alt={`Page ${entry.pageNumber ?? index + 1}`} className="h-10 w-14 rounded border object-cover dark:border-gray-700" loading="lazy" />
                  ) : (
                    <span className="text-gray-300 dark:text-gray-700">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => onDelete(entry.id)} className="rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-rose-600 dark:hover:bg-gray-800" title="Delete">
                      🗑
                    </button>
                    {entry.status === 'error' && (
                      <button onClick={() => onRetry(entry.id)} className="rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-amber-600 dark:hover:bg-gray-800" title="Retry">
                        🔄
                      </button>
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
