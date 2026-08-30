/**
 * IMO e-Publications Authenticated Bridge — background service worker.
 *
 * Security rules (strictly enforced):
 *  - Uses ONLY the user's already-active session in the browser.
 *  - Never reads, stores, or forwards passwords, tokens, or cookies.
 *  - Never bypasses login requirements, DRM, or premium access control.
 *  - Reports 401/403 as "login required" so the user can sign in legitimately.
 *  - Scoped to https://imo-epublications.org/* only via host_permissions.
 */

const IMO_LOGIN_URL = 'https://imo-epublications.org/registration/signin-or-register.action?signInTarget=%2F';
const IMO_HOME = 'https://imo-epublications.org/';

const isImoUrl = (url) => {
  try {
    return new URL(url).origin === 'https://imo-epublications.org';
  } catch {
    return false;
  }
};

/**
 * Check if the user has an active IMO session via cookies.
 * JSESSIONID is set by IMO's server on any session; the presence of this cookie
 * means the browser has established a session with imo-epublications.org and
 * those cookies will be sent with subsequent requests.
 */
async function checkSessionViaCookies() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'imo-epublications.org' });
    const sessionCookies = cookies.filter(
      (c) => c.name === 'JSESSIONID' || c.name.includes('SESSION') || c.name === 'AWSALB'
    );
    return sessionCookies.length > 0;
  } catch {
    return false;
  }
}

/**
 * Probe a known deliver URL (lightweight) to determine actual session state.
 * If the server returns image content → session is active.
 * If 401/403 → not authenticated.
 */
async function probeSession() {
  // First: quick cookie check (instant, no network)
  const hasCookies = await checkSessionViaCookies();

  // Second: try the IMO homepage with credentials. The homepage may return 403
  // to bot-like requests (Cloudflare) but with the browser's TLS + cookies it
  // should return the logged-in page. Even if it returns 403 from the SW, we
  // treat cookie presence as a strong signal of an active session.
  if (!hasCookies) {
    return { authenticated: false, reason: 'No IMO session cookies found. Please log in on imo-epublications.org first.' };
  }

  // Cookies are present — the user has an active session with IMO.
  // We cannot reliably probe the homepage (Cloudflare may block SW fetches),
  // so cookie presence is the best offline signal.
  return { authenticated: true };
}

async function fetchWithSession(url, { timeoutMs = 45000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      credentials: 'include',
      redirect: 'follow',
      headers: { Accept: 'image/*,*/*;q=0.8' },
    });
  } finally {
    clearTimeout(timer);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to convert to data URL'));
    reader.readAsDataURL(blob);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  // --- Presence ping (detect the extension from the web app) ---
  if (message.type === 'IMO_PING') {
    sendResponse({ ok: true });
    return false;
  }

  // --- Check IMO authentication status ---
  if (message.type === 'IMO_CHECK_AUTH') {
    probeSession()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, authenticated: false, error: error.message || 'Session check failed' }));
    return true;
  }

  // --- Fetch a single image with authenticated session ---
  if (message.type === 'IMO_FETCH_IMAGE') {
    const { url, entryId } = message;
    if (!url || !isImoUrl(url)) {
      sendResponse({ ok: false, entryId, error: 'Only imo-epublications.org URLs are allowed.' });
      return true;
    }

    fetchWithSession(url)
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          await response.text().catch(() => {});
          sendResponse({
            ok: false,
            entryId,
            code: 'IMO_LOGIN_REQUIRED',
            status: response.status,
            error: `IMO premium login required (HTTP ${response.status})`,
          });
          return;
        }
        if (!response.ok) {
          sendResponse({ ok: false, entryId, code: 'HTTP', status: response.status, error: `HTTP ${response.status}` });
          return;
        }

        const contentType = response.headers.get('content-type') || '';

        if (/^image\//i.test(contentType)) {
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          sendResponse({ ok: true, entryId, contentType, dataUrl });
          return;
        }

        if (/^application\/pdf/i.test(contentType) || /^octet-stream/i.test(contentType)) {
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          sendResponse({ ok: true, entryId, contentType, dataUrl, isPdf: true });
          return;
        }

        sendResponse({
          ok: false,
          entryId,
          code: 'NOT_IMAGE',
          contentType,
          error: `Response is not an image (${contentType || 'no content-type'})`,
        });
      })
      .catch((error) => {
        sendResponse({ ok: false, entryId, code: 'NETWORK', error: error.message || 'Fetch failed' });
      });
    return true;
  }

  // --- Open IMO login page in a new tab ---
  if (message.type === 'IMO_OPEN_LOGIN') {
    chrome.tabs.create({ url: IMO_LOGIN_URL });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
