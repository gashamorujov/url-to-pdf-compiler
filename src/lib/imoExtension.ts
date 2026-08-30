/**
 * Bridge between the web app and the "IMO Authenticated Bridge" Chrome extension.
 *
 * Auth detection is done via a REAL probe — the extension fetches the IMO
 * homepage with the user's browser session cookies and checks the response.
 * No fake login. No credentials stored. No sessionStorage flags.
 */

export interface ImoAuthResult {
  available: boolean;
  authenticated: boolean | null; // null = unknown
  reason?: string;
}

export const IMO_LOGIN_URL = 'https://imo-epublications.org/registration/signin-or-register.action?signInTarget=%2F';
export const IMO_ORIGIN = 'https://imo-epublications.org';

const BRIDGE_KEY = '__imo_bridge__';
const PING_TIMEOUT_MS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;

export function isImoUrl(url: string): boolean {
  try { return new URL(url).origin === IMO_ORIGIN; } catch { return false; }
}

// ---------------------------------------------------------------------------
// Bridge messaging
// ---------------------------------------------------------------------------

let extensionAvailable: boolean | undefined;

async function bridgeRequest<T>(payload: Record<string, unknown>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T & { ok: boolean }> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('IMO bridge request timed out')), timeoutMs);
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (event.source !== window || !data || data[BRIDGE_KEY] !== true || data.requestId !== requestId) return;
      window.removeEventListener('message', handler);
      clearTimeout(timer);
      if (data.ok === false) { reject(new Error(data.error || 'IMO bridge request failed')); return; }
      resolve(data as T & { ok: boolean });
    };
    window.addEventListener('message', handler);
    window.postMessage({ [BRIDGE_KEY]: true, ...payload, requestId }, '*');
  });
}

export async function isExtensionAvailable(): Promise<boolean> {
  if (extensionAvailable !== undefined) return extensionAvailable;
  try {
    await bridgeRequest<{ ok: boolean }>({ type: 'IMO_PING' }, PING_TIMEOUT_MS);
    extensionAvailable = true;
  } catch {
    extensionAvailable = false;
  }
  return extensionAvailable;
}

export function resetExtensionDetection() {
  extensionAvailable = undefined;
}

// ---------------------------------------------------------------------------
// Authentication — REAL probe, no fake state
// ---------------------------------------------------------------------------

/**
 * Check IMO authentication status. The extension makes a REAL fetch to the IMO
 * homepage with the user's browser cookies and checks the HTTP response.
 * "Login successful" is only shown when IMO server confirms authentication.
 */
export async function checkImoAuth(): Promise<ImoAuthResult> {
  const available = await isExtensionAvailable();
  if (!available) return { available: false, authenticated: null };

  try {
    const result = await bridgeRequest<{ authenticated: boolean; reason?: string }>(
      { type: 'IMO_CHECK_AUTH' },
      25_000,
    );
    return { available: true, authenticated: result.authenticated, reason: result.reason };
  } catch (error) {
    return { available: true, authenticated: null, reason: error instanceof Error ? error.message : 'Session check failed' };
  }
}

// ---------------------------------------------------------------------------
// Image fetch
// ---------------------------------------------------------------------------

export interface ImoFetchedImage {
  contentType: string;
  dataUrl: string;
  isPdf: boolean;
}

export async function fetchImoImage(url: string): Promise<ImoFetchedImage> {
  if (!isImoUrl(url)) throw new Error('Only imo-epublications.org URLs can be fetched through the extension.');
  const result = await bridgeRequest<ImoFetchedImage & { code?: string }>({ type: 'IMO_FETCH_IMAGE', url });
  if (!result.dataUrl) throw new Error('Empty response from IMO bridge');
  return { contentType: result.contentType, dataUrl: result.dataUrl, isPdf: !!result.isPdf };
}

// ---------------------------------------------------------------------------
// Open IMO login page (user logs in on IMO's own page — no credentials collected)
// ---------------------------------------------------------------------------

export async function openImoLogin(): Promise<void> {
  const available = await isExtensionAvailable();
  if (available) {
    try {
      await bridgeRequest<{ ok: boolean }>({ type: 'IMO_OPEN_LOGIN' }, 5000);
      return;
    } catch { /* fall through */ }
  }
  window.open(IMO_LOGIN_URL, '_blank', 'noopener');
}
