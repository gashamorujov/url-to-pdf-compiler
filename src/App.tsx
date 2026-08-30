import { useCallback, useEffect, useRef, useState } from 'react';
import type { UrlEntry, PreviewMode, LoadProgress, PdfProgress } from './types';
import { analyzeUrls } from './lib/analyze';
import { ConcurrencyQueue, errorMessageFor, fetchImageBlob, prepareForPdf, type EntryPatch } from './lib/imageLoader';
import { exportUrlsCsv, exportUrlsTxt, triggerDownload } from './lib/export';
import { generatePdf, type PdfPageInput } from './lib/pdfGenerator';
import { useTheme } from './hooks/useTheme';
import { useToasts } from './hooks/useToasts';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { UrlInput } from './components/UrlInput';
import { UrlTable } from './components/UrlTable';
import { PreviewPanel } from './components/PreviewPanel';
import { ActionBar } from './components/ActionBar';
import { PdfModal } from './components/PdfModal';
import { FailedWarningModal } from './components/FailedWarningModal';
import { ToastStack } from './components/ToastStack';

function normalizeFilename(name: string): string {
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { toasts, dismiss, push } = useToasts();

  const [rawInput, setRawInput] = useState('');
  const [entries, setEntries] = useState<UrlEntry[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('grid');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [concurrency, setConcurrency] = useState(4);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfProgress | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfDownloadName, setPdfDownloadName] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [failedModalOpen, setFailedModalOpen] = useState(false);

  const concurrencyRef = useRef(concurrency);
  concurrencyRef.current = concurrency;

  const togglePreview = useCallback(() => {
    setPreviewOpen((open) => {
      push('info', open ? 'Preview closed' : 'Preview opened');
      return !open;
    });
  }, [push]);

  // CTRL/CMD + SHIFT + P toggles the preview panel.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.shiftKey && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        togglePreview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePreview]);

  const patchEntry = useCallback((id: string, patch: EntryPatch) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }, []);

  const loadEntry = useCallback(
    async (entry: UrlEntry, queue: ConcurrencyQueue) => {
      return queue.run(async () => {
        patchEntry(entry.id, { status: 'loading', error: undefined });
        try {
          const raw = await fetchImageBlob(entry.url);
          const prepared = await prepareForPdf(raw);
          let objectUrl = '';
          if (prepared.contentType === 'image/png') {
            objectUrl = URL.createObjectURL(new Blob([prepared.blob], { type: 'image/png' }));
          } else {
            objectUrl = URL.createObjectURL(prepared.blob);
          }
          patchEntry(entry.id, {
            status: 'loaded',
            blob: prepared.blob,
            contentType: prepared.contentType,
            objectUrl,
          });
        } catch (error) {
          patchEntry(entry.id, { status: 'error', error: errorMessageFor(error) });
        }
      });
    },
    [patchEntry],
  );

  const loadAll = useCallback(
    async (entriesToLoad: UrlEntry[]) => {
      if (entriesToLoad.length === 0) return;
      setLoadProgress({ done: 0, total: entriesToLoad.length });
      const queue = new ConcurrencyQueue(concurrencyRef.current);
      const unique = [...new Set(entriesToLoad.map((entry) => entry.id))];
      const byId = new Map(unique.map((id) => [id, entriesToLoad.find((entry) => entry.id === id)!]));

      let doneCounter = 0;
      await Promise.all(
        [...byId.values()].map(async (entry) => {
          await loadEntry(entry, queue);
          doneCounter++;
          setLoadProgress((current) => (current ? { ...current, done: doneCounter } : { done: doneCounter, total: byId.size }));
        }),
      );
      setLoadProgress(null);
    },
    [loadEntry],
  );

  const handleAnalyze = useCallback(() => {
    try {
      setAnalyzing(true);
      // Give the UI a frame to show the analyzing state.
      window.setTimeout(() => {
        const { entries: result, stats } = analyzeUrls(rawInput);
        setEntries(result);
        setAnalyzed(true);
        setAnalyzing(false);
        setPdfDownloadUrl(null);
        setPdfDownloadName(null);

        push('info', `Analyzed ${stats.total} valid URL(s)`);
        if (stats.duplicatesRemoved > 0) push('warning', `${stats.duplicatesRemoved} duplicate URL(s) removed`);
        if (stats.invalid > 0) push('warning', `${stats.invalid} invalid URL(s) skipped`);
        if (stats.duplicatePages.length > 0) push('warning', `Duplicate page numbers: ${stats.duplicatePages.join(', ')}`);

        void loadAll(result);
      }, 50);
    } catch (error) {
      setAnalyzing(false);
      push('error', error instanceof Error ? error.message : 'Analysis failed');
    }
  }, [rawInput, loadAll, push]);

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((current) => {
        const entry = current.find((entry) => entry.id === id);
        if (entry?.objectUrl) URL.revokeObjectURL(entry.objectUrl);
        return current.filter((entry) => entry.id !== id);
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setEntries((current) => {
      current.forEach((entry) => {
        if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
      });
      return [];
    });
    setAnalyzed(false);
    setPdfDownloadUrl(null);
    setPdfDownloadName(null);
  }, []);

  const retryEntry = useCallback(
    (id: string) => {
      const entry = entries.find((entry) => entry.id === id);
      if (!entry) return;
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
      const refreshed: UrlEntry = { ...entry, status: 'pending', error: undefined, objectUrl: undefined };
      setEntries((current) => current.map((e) => (e.id === id ? refreshed : e)));
      const queue = new ConcurrencyQueue(1);
      void loadEntry(refreshed, queue);
    },
    [entries, loadEntry],
  );

  const retryAllFailed = useCallback(() => {
    const failed = entries.filter((entry) => entry.status === 'error');
    failed.forEach((entry) => {
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    });
    setEntries((current) =>
      current.map((entry) =>
        entry.status === 'error' ? { ...entry, status: 'pending', error: undefined, objectUrl: undefined } : entry,
      ),
    );
    const refreshed = entries.filter((entry) => entry.status === 'error').map((entry) => ({ ...entry, status: 'pending' as const, error: undefined, objectUrl: undefined }));
    void loadAll(refreshed);
  }, [entries, loadAll]);

  const openPdfModal = useCallback(() => {
    const loaded = entries.filter((entry) => entry.status === 'loaded');
    const failed = entries.filter((entry) => entry.status === 'error');
    if (loaded.length === 0) {
      push('error', 'No images loaded to create a PDF');
      return;
    }
    if (failed.length > 0) {
      setFailedModalOpen(true);
      return;
    }
    setPdfModalOpen(true);
  }, [entries, push]);

  const createPdf = useCallback(
    async (filename: string) => {
      const loaded = entries.filter((entry) => entry.status === 'loaded');
      if (loaded.length === 0) {
        push('error', 'No images loaded to create a PDF');
        return;
      }

      setPdfModalOpen(false);
      setFailedModalOpen(false);
      setGeneratingPdf(true);
      setPdfProgress({ done: 0, total: loaded.length });

      try {
        const inputs: PdfPageInput[] = await Promise.all(
          loaded.map(async (entry) => {
            const buffer = await entry.blob!.arrayBuffer();
            return {
              url: entry.url,
              contentType: entry.contentType ?? 'image/jpeg',
              buffer,
            };
          }),
        );

        const output = await generatePdf(inputs, setPdfProgress);
        const url = URL.createObjectURL(output.blob);
        if (pdfDownloadUrl) URL.revokeObjectURL(pdfDownloadUrl);
        setPdfDownloadUrl(url);
        setPdfDownloadName(filename);
        triggerDownload(url, filename);
        push('success', 'PDF created successfully');
      } catch (error) {
        push('error', error instanceof Error ? error.message : 'PDF generation failed');
      } finally {
        setGeneratingPdf(false);
        setPdfProgress(null);
      }
    },
    [entries, push, pdfDownloadUrl],
  );

  const handleCreateWithLoaded = useCallback(() => {
    setFailedModalOpen(false);
    setPdfModalOpen(true);
  }, []);

  const handlePdfModalCreate = useCallback(
    (name: string) => {
      const normalized = normalizeFilename(name);
      void createPdf(normalized);
    },
    [createPdf],
  );

  const handleDownloadAgain = useCallback(() => {
    if (pdfDownloadUrl && pdfDownloadName) {
      triggerDownload(pdfDownloadUrl, pdfDownloadName);
      push('info', 'Download started');
    }
  }, [pdfDownloadUrl, pdfDownloadName, push]);

  const loadedCount = entries.filter((entry) => entry.status === 'loaded').length;
  const failedCount = entries.filter((entry) => entry.status === 'error').length;

  return (
    <div className="flex min-h-full flex-col">

      <Header theme={theme} onToggleTheme={toggleTheme} />

      <Hero />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 pb-28">
        <UrlInput value={rawInput} onChange={setRawInput} onAnalyze={handleAnalyze} detecting={analyzing} />

        {analyzed && entries.length > 0 && (
          <>
            <UrlTable
              entries={entries}
              onLoadProgress={loadProgress}
              previewOpen={previewOpen}
              previewMode={previewMode}
              onTogglePreview={togglePreview}
              onModeChange={setPreviewMode}
              concurrency={concurrency}
              onConcurrencyChange={setConcurrency}
              onDelete={deleteEntry}
              onRetry={retryEntry}
              onRetryAllFailed={retryAllFailed}
              onClearAll={clearAll}
              onExportTxt={() => exportUrlsTxt(entries)}
              onExportCsv={() => exportUrlsCsv(entries)}
            />
            <PreviewPanel open={previewOpen} entries={entries} mode={previewMode} onModeChange={setPreviewMode} />
          </>
        )}

        {analyzed && entries.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No valid URLs found. Check your input.
          </p>
        )}
      </main>

      <ActionBar
        entriesCount={entries.length}
        loadedCount={loadedCount}
        failedCount={failedCount}
        previewOpen={previewOpen}
        generatingPdf={generatingPdf}
        pdfProgress={pdfProgress}
        pdfDownloadUrl={pdfDownloadUrl}
        pdfDownloadName={pdfDownloadName}
        onTogglePreview={togglePreview}
        onDownloadPdf={openPdfModal}
        onDownloadAgain={handleDownloadAgain}
      />

      <PdfModal isOpen={pdfModalOpen} onCancel={() => setPdfModalOpen(false)} onCreate={handlePdfModalCreate} />

      <FailedWarningModal
        isOpen={failedModalOpen}
        loaded={loadedCount}
        failed={failedCount}
        total={entries.length}
        onCancel={() => setFailedModalOpen(false)}
        onRetryFailed={() => { setFailedModalOpen(false); retryAllFailed(); }}
        onCreateWithLoaded={handleCreateWithLoaded}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <Footer />
    </div>
  );
}
