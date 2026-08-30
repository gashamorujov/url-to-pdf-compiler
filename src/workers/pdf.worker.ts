/// <reference lib="webworker" />
import { PDFDocument, type PDFImage } from 'pdf-lib';

interface PdfPageInput {
  url: string;
  contentType: string;
  buffer: ArrayBuffer;
}

interface PdfJob {
  pages: PdfPageInput[];
}

self.onmessage = async (event: MessageEvent<PdfJob>) => {
  const { pages } = event.data;

  try {
    const doc = await PDFDocument.create();
    const total = pages.length;

    for (let index = 0; index < total; index++) {
      const page = pages[index];
      const bytes = new Uint8Array(page.buffer);

      let image: PDFImage;
      if (/image\/png/i.test(page.contentType)) {
        image = await doc.embedPng(bytes);
      } else {
        image = await doc.embedJpg(bytes);
      }

      const { width, height } = image;
      const pdfPage = doc.addPage([width, height]);
      pdfPage.drawImage(image, { x: 0, y: 0, width, height });

      self.postMessage({ type: 'progress', done: index + 1, total });
    }

    const pdfBytes = await doc.save({ useObjectStreams: true });
    const transferable = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;

    self.postMessage({ type: 'done', buffer: transferable }, { transfer: [transferable] });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'PDF generation failed',
    });
  }
};
