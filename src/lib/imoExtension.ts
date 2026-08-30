/**
 * Bridge between the web app and the "IMO Authenticated Bridge" Chrome
 * extension (extension/ folder).
 *
 * Security rules:
 * - The extension handles all IMO communication.
 * - Credentials are sent directly to IMO's own login page via the extension;
 *   they are NEVER sent to our web app server, logged, or stored persistently.
 * - The web app only stores a local "connected" flag in sessionStorage.
 */

export interface ImoAuthResult {
  available: boolean;
  authenticated: boolean | null;
  reason?: string;
}

export const IMO_LOGIN_URL = 'https://imo-epublications.org/registration/signin-or-register.action?signInTarget=%2F';
export const IMO_ORIGIN = 'https://imo-epublications.org';

const BRIDGE_KEY = '__imo_bridge__';
const PING_TIMEOUT_MS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;
const CONNECTED_FLAG_KEY = 'imo_connected';

export function isImoUrl(url: string): boolean {
  try {
    return new URL(url).origin === IMO_ORIGIN;
  } catch {
    return false;
  }
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
      if (
        event.source !== window ||
        !data ||
        data[BRIDGE_KEY] !== true ||
        data.requestId !== requestId
      ) {
        return;
      }
      window.removeEventListener('message', handler);
      clearTimeout(timer);
      if (data.ok === false) {
        reject(new Error(data.error || 'IMO bridge request failed'));
        return;
      }
      resolve(data as T & { ok: boolean });
    };

    window.addEventListener('message', handler);
    window.postMessage({ [BRIDGE_KEY]: true, ...payload, requestId }, '*');
  });
}

// ---------------------------------------------------------------------------
// Extension detection
// ---------------------------------------------------------------------------

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
// Connected state (app-local — does NOT touch IMO server or cookies)
// ---------------------------------------------------------------------------

export function isConnected(): boolean {
  try {
    return sessionStorage.getItem(CONNECTED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setConnected(val: boolean) {
  try {
    sessionStorage.setItem(CONNECTED_FLAG_KEY, val ? 'true' : 'false');
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Authentication status
// ---------------------------------------------------------------------------

export async function checkImoAuth(): Promise<ImoAuthResult & { connected?: boolean }> {
  const connected = isConnected();
  const available = await isExtensionAvailable();
  if (!available) {
    return { available: false, authenticated: null, connected };
  }
  try {
    const result = await bridgeRequest<{ authenticated: boolean; reason?: string }>({
      type: 'IMO_CHECK_AUTH',
    }, 20_000);
    return { available: true, authenticated: result.authenticated, reason: result.reason, connected };
  } catch (error) {
    return { available: true, authenticated: null, reason: error instanceof Error ? error.message : 'Session check failed', connected };
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
  if (!isImoUrl(url)) {
    throw new Error('Only imo-epublications.org URLs can be fetched through the extension.');
  }
  const result = await bridgeRequest<ImoFetchedImage & { code?: string }>({
    type: 'IMO_FETCH_IMAGE',
    url,
  });
  if (!result.dataUrl) {
    throw new Error('Empty response from IMO bridge');
  }
  return { contentType: result.contentType, dataUrl: result.dataUrl, isPdf: !!result.isPdf };
}

// ---------------------------------------------------------------------------
// Login (credentials → IMO login page directly, never to our server)
// ---------------------------------------------------------------------------

/**
 * Open IMO's login page and auto-fill the credentials using the login-fill
 * content script.  Credentials travel from this page → extension background →
 * login-fill.js on the IMO page → IMO's own form.  They are NEVER stored
 * persistently, never logged, and never sent to any server other than IMO's
 * own endpoint.
 */
export async function loginImo(username: string, password: string): Promise<void> {
  await bridgeRequest<{ ok: boolean }>({
    type: 'IMO_LOGIN',
    username,
    password,
  }, 120_000);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Clear the app-local "IMO connected" flag only.
 * Does NOT log the user out of imo-epublications.org — it simply removes our
 * app's knowledge of the connection.  The user must log in again via the form.
 */
export async function logoutImo(): Promise<void> {
  setConnected(false);
  resetExtensionDetection();
  try {
    await bridgeRequest<{ ok: boolean }>({ type: 'IMO_LOGOUT' }, 5000);
  } catch { /* extension may not be installed */ }
}
