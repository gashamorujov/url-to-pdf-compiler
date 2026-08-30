export type EntryStatus = 'pending' | 'loading' | 'loaded' | 'error';

export interface UrlEntry {
  id: string;
  url: string;
  pageNumber: number | null;
  status: EntryStatus;
  error?: string;
  blob?: Blob;
  contentType?: string;
  objectUrl?: string;
  originalIndex?: number;
}

export interface AnalysisStats {
  total: number;
  duplicatesRemoved: number;
  invalid: number;
  duplicatePages: number[];
}

export type PreviewMode = 'grid' | 'list';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

export interface LoadProgress {
  done: number;
  total: number;
}

export interface PdfProgress {
  done: number;
  total: number;
}
