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
    <div className="sticky bottom-0 z-40 border-t border-cyan-500/25 bg-[#05060f]/90 backdrop-blur">
      {generatingPdf && pdfProgress && (
        <div className="border-b border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
          <div className="mb-1 flex justify-between uppercase tracking-widest">
            <span>Creating PDF…</span>
            <span>{pdfProgress.done} / {pdfProgress.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-cyan-500/20">
            <div
              className="h-full rounded-full bg-cyan-400 shadow-[0_0_12px_#00e5ff] transition-all duration-300"
              style={{ width: `${(pdfProgress.done / pdfProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={onTogglePreview} className="cyber-btn cyber-btn-ghost">
          {previewOpen ? 'Hide Preview' : 'Show Preview'}
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={loadedCount === 0 || generatingPdf}
          className="cyber-btn cyber-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generatingPdf ? 'Generating…' : `Download PDF (${loadedCount})${failedCount > 0 ? ` · ${failedCount} failed` : ''}`}
        </button>

        {pdfDownloadUrl && pdfDownloadName && (
          <button onClick={onDownloadAgain} className="cyber-btn border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 hover:shadow-[0_0_16px_rgba(16,255,160,0.2)]">
            Download Again
          </button>
        )}

        <span className="ml-auto text-xs uppercase tracking-widest text-cyan-500/60">
          {entriesCount > 0 ? `${entriesCount} URL(s) loaded` : ''}
        </span>
      </div>
    </div>
  );
}
