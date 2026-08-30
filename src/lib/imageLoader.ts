import type { UrlEntry } from '../types';
import { isSameOrigin } from './analyze';

export type LoadErrorCode = 'network' | 'cors' | 'http' | 'invalid' | 'timeout';

export interface LoadResult {
  blob: Blob;
  contentType: string;
}

export class LoadFailure extends Error {
  code: LoadErrorCode;
  status?: number;

  constructor(code: LoadErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Fetch an image blob. If `proxyBase` is configured, the target URL is encoded and
 * appended to the proxy endpoint (the proxy is expected to return the image with
 * permissive CORS headers).
 */
export async function fetchImageBlob(
  url: string,
  proxyBase?: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<LoadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const target = proxyBase && proxyBase.trim()
    ? `${proxyBase.replace(/\/?$/, '/')}${encodeURIComponent(url)}`
    : url;

  try {
    const response = await fetch(target, { mode: 'cors', signal: controller.signal });
    if (!response.ok) {
      throw new LoadFailure('http', `HTTP ${response.status}`, response.status);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new LoadFailure('invalid', 'Response is not an image');
    }

    const blob = await response.blob();
    return { blob, contentType };
  } catch (err) {
    if (err instanceof LoadFailure) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LoadFailure('timeout', 'Request timed out');
    }
    // A TypeError from fetch almost always means CORS or pure network failure.
    throw new LoadFailure(
      isSameOrigin(url) ? 'network' : 'cors',
      isSameOrigin(url) ? 'Network error' : 'CORS blocked',
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Decode and losslessly re-encode an unsupported format (WebP, AVIF, GIF, BMP, ...)
 * to PNG so it can be embedded in a PDF without visible quality loss.
 * The original pixel dimensions are kept.
 */
export async function convertToPng(blob: Blob): Promise<LoadResult> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new LoadFailure('invalid', 'Canvas is unavailable');

    ctx.drawImage(bitmap, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new LoadFailure('invalid', 'PNG conversion failed'))),
        'image/png',
      );
    });
    return { blob: pngBlob, contentType: 'image/png' };
  } finally {
    bitmap.close();
  }
}

export function isJpeg(contentType: string): boolean {
  return /image\/jpe?g/i.test(contentType);
}

export function isPng(contentType: string): boolean {
  return /image\/png/i.test(contentType);
}

/**
 * Decide whether a fetched blob can be embedded directly (jpeg/png) or needs
 * conversion to PNG for the PDF document.
 */
export async function prepareForPdf(result: LoadResult): Promise<LoadResult> {
  if (isJpeg(result.contentType) || isPng(result.contentType)) return result;
  return convertToPng(result.blob);
}

export function errorMessageFor(error: unknown): string {
  if (error instanceof LoadFailure) return error.message;
  return error instanceof Error ? error.message : 'Unknown error';
}

/** Simple concurrency limiter used for batch image downloads. */
export class ConcurrencyQueue {
  private active = 0;
  private waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      const next = this.waiters.shift();
      if (next) next();
    }
  }
}

export type EntryPatch = Pick<UrlEntry, 'status'> & Partial<Pick<UrlEntry, 'error' | 'blob' | 'contentType' | 'objectUrl'>>;
