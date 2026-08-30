import type { PdfProgress } from '../types';

export interface PdfPageInput {
  url: string;
  contentType: string;
  buffer: ArrayBuffer;
}

export interface PdfOutput {
  blob: Blob;
  sizeBytes: number;
}

type WorkerResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string };

/**
 * Generate a PDF inside a Web Worker so the main UI thread stays responsive.
 * Image buffers are transferred (not copied) to the worker, which is
 * memory-friendly for large batches.
 */
export function generatePdf(
  pages: PdfPageInput[],
  onProgress: (progress: PdfProgress) => void,
): Promise<PdfOutput> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.type === 'progress') {
        onProgress({ done: data.done, total: data.total });
      } else if (data.type === 'done') {
        worker.terminate();
        resolve({
          blob: new Blob([data.buffer], { type: 'application/pdf' }),
          sizeBytes: data.buffer.byteLength,
        });
      } else {
        worker.terminate();
        reject(new Error(data.message));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(error.message || 'PDF worker crashed'));
    };

    worker.postMessage(
      { pages },
      { transfer: pages.map((page) => page.buffer) },
    );
  });
}
