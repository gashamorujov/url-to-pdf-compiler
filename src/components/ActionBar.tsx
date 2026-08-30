import type { PdfProgress } from '../types';

interface ActionBarProps {
  entriesCount: number;
  loadedCount: number;
  failedCount: number;
  previewOpen: boolean;
  generatingPdf: boolean;
  pdfProgress: PdfProgress | null;
  pdfDownloadUrl: string | null;
  pdfDownloadName: string | null;
  onTogglePreview: () => void;
  onDownloadPdf: () => void;
  onDownloadAgain: () => void;
}

export function ActionBar({
  entriesCount,
  loadedCount,
  failedCount,
  previewOpen,
  generatingPdf,
  pdfProgress,
  pdfDownloadUrl,
  pdfDownloadName,
  onTogglePreview,
  onDownloadPdf,
  onDownloadAgain,
}: ActionBarProps) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      {/* PDF generation progress */}
      {generatingPdf && pdfProgress && (
        <div className="bg-indigo-50 px-4 py-2 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          <div className="mb-1 flex justify-between">
            <span>Creating PDF…</span>
            <span>{pdfProgress.done} / {pdfProgress.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-indigo-200 dark:bg-indigo-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${(pdfProgress.done / pdfProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-3">
        <button
          onClick={onTogglePreview}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {previewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={loadedCount === 0 || generatingPdf}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generatingPdf ? 'Generating…' : `Download PDF (${loadedCount})${failedCount > 0 ? ` · ${failedCount} failed` : ''}`}
        </button>

        {pdfDownloadUrl && pdfDownloadName && (
          <button
            onClick={onDownloadAgain}
            className="rounded-lg border border-emerald-300 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            Download Again
          </button>
        )}
      </div>

      <p className="pb-3 text-center text-xs text-gray-400 dark:text-gray-500">
        {entriesCount > 0 ? `${entriesCount} URL(s) loaded` : ''}
      </p>
    </div>
  );
}
