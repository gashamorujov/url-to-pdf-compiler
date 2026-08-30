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

const REQUEST_TIMEOUT_MS = 25_000;
const PROXY_TIMEOUT_MS = 40_000;
const MAX_URL_LENGTH = 8000;

/**
 * Candidate same-origin CORS proxy endpoints, in order of preference.
 * Only one that actually exists on the deployed host is used.
 */
const PROXY_CANDIDATES = [
  '/@proxy',
  '/api/image-proxy',
  '/.netlify/functions/image-proxy',
];

let cachedProxyEndpoint: string | null | undefined;

function explicitProxyEnv(): string | undefined {
  const value = import.meta.env.VITE_CORS_PROXY as string | undefined;
  if (value && value.trim()) return value.trim().replace(/\/$/, '');
  return undefined;
}

/**
 * Find a working proxy endpoint. The explicit `VITE_CORS_PROXY` wins; otherwise
 * the same-origin candidates are probed (cheap 404 checks) and cached.
 */
async function resolveProxyEndpoint(): Promise<string> {
  if (cachedProxyEndpoint !== undefined) {
    if (cachedProxyEndpoint === null) {
      throw new LoadFailure('network', 'No CORS proxy endpoint is available on this host. Deploy the bundled proxy function (netlify/functions or api/) or set VITE_CORS_PROXY.');
    }
    return cachedProxyEndpoint;
  }

  const explicit = explicitProxyEnv();
  if (explicit) {
    cachedProxyEndpoint = explicit;
    return explicit;
  }

  const probeController = new AbortController();
  const probeTimer = setTimeout(() => probeController.abort(), 5000);
  try {
    for (const path of PROXY_CANDIDATES) {
      try {
        const probe = await fetch(`${path}?url=__probe__`, {
          method: 'GET',
          signal: probeController.signal,
        });
        if (probe.status !== 404 && probe.status !== 405) {
          cachedProxyEndpoint = path;
          return path;
        }
      } catch {
        // host not found / network issue - try the next candidate
      }
    }
  } finally {
    clearTimeout(probeTimer);
  }

  cachedProxyEndpoint = null;
  throw new LoadFailure('network', 'No CORS proxy endpoint is available on this host. Deploy the bundled proxy function (netlify/functions or api/) or set VITE_CORS_PROXY.');
}

async function consumeResponse(response: Response): Promise<LoadResult> {
  if (!response.ok) {
    const status = response.status;
    let message = `HTTP ${status}`;
    if (status === 401) message = 'HTTP 401 — the remote server requires authentication. This app does not bypass access control.';
    if (status === 403) message = 'HTTP 403 — access to this resource is forbidden. This app does not bypass access control.';
    throw new LoadFailure('http', message, status);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new LoadFailure('invalid', `Response is not an image (${contentType || 'no content-type header'})`);
  }

  const blob = await response.blob();
  return { blob, contentType };
}

async function directFetch(url: string, timeoutMs: number): Promise<LoadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { mode: 'cors', signal: controller.signal });
    return await consumeResponse(response);
  } catch (error) {
    if (error instanceof LoadFailure) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LoadFailure('timeout', 'Request timed out');
    }
    throw new LoadFailure(
      isSameOrigin(url) ? 'network' : 'cors',
      isSameOrigin(url) ? 'Network error' : 'CORS blocked by the remote server',
    );
  } finally {
    clearTimeout(timer);
  }
}

async function proxyFetch(url: string, timeoutMs: number): Promise<LoadResult> {
  const endpoint = await resolveProxyEndpoint();
  const target = `${endpoint}?url=${encodeURIComponent(url)}`;

  if (target.length > MAX_URL_LENGTH + endpoint.length) {
    throw new LoadFailure('invalid', 'URL is too long to proxy');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      mode: 'cors',
      signal: controller.signal,
      headers: { Accept: 'image/*,*/*;q=0.8' },
    });
    return await consumeResponse(response);
  } catch (error) {
    if (error instanceof LoadFailure) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LoadFailure('timeout', 'Proxy request timed out');
    }
    throw new LoadFailure('network', 'CORS proxy request failed');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch an image blob. Tries the direct (CORS-permitting) request first; on
 * CORS/network/timeout failures only, falls back to the same-origin secure
 * proxy. HTTP 4xx/5xx and non-image responses are surfaced immediately and are
 * never retried via the proxy (access control is never bypassed).
 */
export async function fetchImageBlob(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<LoadResult> {
  try {
    return await directFetch(url, timeoutMs);
  } catch (error) {
    if (error instanceof LoadFailure && (error.code === 'http' || error.code === 'invalid')) throw error;
    // CORS / network / timeout -> try the secure proxy fallback.
  }
  return proxyFetch(url, PROXY_TIMEOUT_MS);
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
