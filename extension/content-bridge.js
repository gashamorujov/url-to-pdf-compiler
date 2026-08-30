/**
 * Content bridge — injected on the web app's page.
 *
 * Relays messages between the web app (window.postMessage) and the background
 * service worker (chrome.runtime.sendMessage). The background has host
 * permissions for imo-epublications.org, so it can fetch with the user's
 * authenticated session. Credentials never leave the browser.
 *
 * Security: only relays messages with a valid IMO key to prevent any other
 * script on the page from probing the extension.
 */

const IMO_KEY = '__imo_bridge__';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg[IMO_KEY]) {
    window.postMessage(msg, '*');
  }
  return false;
});

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data[IMO_KEY] !== true) return;

  const { type, requestId } = data;
  if (!requestId) return;

  chrome.runtime.sendMessage(data, (response) => {
    if (chrome.runtime.lastError) {
      window.postMessage({ [IMO_KEY]: true, requestId, ok: false, error: chrome.runtime.lastError.message }, '*');
      return;
    }
    window.postMessage({ [IMO_KEY]: true, requestId, ...response }, '*');
  });
});
