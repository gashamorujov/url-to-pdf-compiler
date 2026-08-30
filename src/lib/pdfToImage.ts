/**
 * Render a PDF document (or a single pageNumber range within it) to JPEG
 * images so each page can be previewed and embedded in the output PDF.
 *
 * Uses pdf.js. The page rendered respects the PDF's own pixel dimensions
 * (scale 1.0 for original quality; no artificial upscaling / downscaling).
 */
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = PdfWorker;

/**
 * Renders the requested page range of a PDF as JPEG blobs (one per page),
 * indexed by absolute page number (1-based). `pages` is a sorted list of the
 * absolute page numbers the user wants (e.g. from the URL query param).
 */
export async function renderPdfPagesToJpeg(
  pdfBytes: ArrayBuffer,
  pages: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<number, Blob>> {
  const doc = await getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const results = new Map<number, Blob>();

  try {
    const uniquePages = [...new Set(pages.map((p) => Math.max(1, Math.floor(p))))].sort((a, b) => a - b);
    const total = uniquePages.length;
    let done = 0;

    for (const pageNumber of uniquePages) {
      if (pageNumber > doc.numPages) continue;
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas unavailable while rendering PDF page');

      const renderContext = {
        canvasContext: ctx,
        canvas,
        viewport: viewport.clone({ scale: outputScale }),
      };
      await page.render(renderContext).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('JPEG conversion failed'))),
          'image/jpeg',
          0.98,
        );
      });

      results.set(pageNumber, blob);
      done++;
      onProgress?.(done, total);
      page.cleanup();
    }

    return results;
  } finally {
    await doc.cleanup();
  }
}
