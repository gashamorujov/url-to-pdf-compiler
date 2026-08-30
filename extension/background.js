/**
 * IMO e-Publications Authenticated Bridge — background service worker.
 *
 * Architecture:
 *  - Uses the user's EXISTING browser session cookies for imo-epublications.org
 *  - Never reads, stores, or forwards passwords, tokens, or cookie values
 *  - Never bypasses login or premium access control
 *  - Auth status is determined by making a REAL fetch and checking the response
 *  - "Login successful" is ONLY shown after IMO server confirms a valid session
 */

const IMO_ORIGIN = 'https://imo-epublications.org';

const isImoUrl = (url) => {
  try { return new URL(url).origin === IMO_ORIGIN; } catch { return false; }
};

/**
 * Auth probe: make a REAL fetch to IMO and check the HTTP response.
 * This is the ONLY way to determine actual authentication status.
 * - 200 + image/content → authenticated (or public content, which is fine)
 * - 401/403 → not authenticated
 * - Network error → unknown
 */
async function probeAuth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(IMO_ORIGIN + '/', {
      signal: controller.signal,
      credentials: 'include',
      redirect: 'follow',
      headers: { Accept: 'text/html,*/*;q=0.8' },
    });
    clearTimeout(timer);

    const url = response.url || '';
    // If redirected to a login/sign-in page, the user is not authenticated
    if (/signin|login|register/i.test(url) && url !== IMO_ORIGIN + '/') {
      return { authenticated: false, reason: 'Redirected to login page — not authenticated on IMO.' };
    }
    if (response.status === 401 || response.status === 403) {
      return { authenticated: false, reason: `IMO returned HTTP ${response.status} — not authenticated.` };
    }
    if (response.ok) {
      // Check if the page content looks like a logged-in page vs a login page
      const body = await response.text();
      if (/name="password"/i.test(body) || /sign.?in.*form/i.test(body)) {
        return { authenticated: false, reason: 'IMO homepage shows login form — not authenticated.' };
      }
      return { authenticated: true };
    }
    return { authenticated: false, reason: `IMO returned HTTP ${response.status}` };
  } catch (error) {
    return { authenticated: false, reason: `Could not reach IMO: ${error.message}` };
  }
}

/**
 * Fetch a URL with the user's browser session cookies (credentials: include).
 * This is how the extension leverages the user's existing IMO session.
 */
async function fetchWithSession(url, { timeoutMs = 60_000 } = {}) {
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

  // --- Check IMO authentication status (REAL probe — no cookie presence check) ---
  if (message.type === 'IMO_CHECK_AUTH') {
    probeAuth()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, authenticated: false, error: error.message || 'Auth probe failed' }));
    return true;
  }

  // --- Fetch a single image/PDF with authenticated session ---
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
            ok: false, entryId,
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
          ok: false, entryId, code: 'NOT_IMAGE', contentType,
          error: `Response is not an image (${contentType || 'no content-type'})`,
        });
      })
      .catch((error) => {
        sendResponse({ ok: false, entryId, code: 'NETWORK', error: error.message || 'Fetch failed' });
      });
    return true;
  }

  // --- Open IMO login page in a new tab (user logs in on IMO's own page) ---
  if (message.type === 'IMO_OPEN_LOGIN') {
    chrome.tabs.create({ url: 'https://imo-epublications.org/registration/signin-or-register.action?signInTarget=%2F' });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
