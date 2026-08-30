import type { UrlEntry } from '../types';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportUrlsTxt(entries: UrlEntry[]) {
  const content = entries.map((entry) => entry.url).join('\n');
  downloadBlob('urls.txt', new Blob([content], { type: 'text/plain;charset=utf-8' }));
}

export function exportUrlsCsv(entries: UrlEntry[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ['#', 'Page Number', 'URL'],
    ...entries.map((entry, index) => [String(index + 1), entry.pageNumber?.toString() ?? '', entry.url]),
  ];
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  downloadBlob('urls.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

export function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
