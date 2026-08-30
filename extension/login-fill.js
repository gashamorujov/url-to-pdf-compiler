/**
 * login-fill.js — injected on imo-epublications.org pages.
 *
 * Listens for IMO_LOGIN_START messages from the background service worker.
 * When received, waits for the login form to appear (Cloudflare challenge
 * may delay it), fills in username and password, and submits the form.
 *
 * Credentials are NEVER stored anywhere — they only exist in memory for
 * the brief moment between filling and form submission.
 */

let pendingCredentials = null;
let waiting = false;

// Listen for login credentials from the background service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'IMO_LOGIN_FILL') {
    pendingCredentials = { username: message.username, password: message.password };
    waiting = true;
    tryFill();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

function tryFill() {
  if (!pendingCredentials || !waiting) return;

  // IMO login page: look for input[name="username"], input[name="password"],
  // and a submit button. The actual form may be behind Cloudflare JS challenge
  // so we poll until the form appears (max 60 seconds).
  const usernameInput =
    document.querySelector('input[name="username"]') ||
    document.querySelector('input[name="email"]') ||
    document.querySelector('input[name="login"]') ||
    document.querySelector('input[type="email"]') ||
    document.querySelector('input[type="text"]');

  const passwordInput =
    document.querySelector('input[name="password"]') ||
    document.querySelector('input[type="password"]');

  if (!usernameInput || !passwordInput) {
    // Form not yet rendered — keep polling
    setTimeout(tryFill, 500);
    return;
  }

  // Fill using native setter to trigger React/jQuery value handlers if any
  const nativeInputSetter =
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  if (nativeInputSetter) {
    nativeInputSetter.call(usernameInput, pendingCredentials.username);
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

    nativeInputSetter.call(passwordInput, pendingCredentials.password);
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    usernameInput.value = pendingCredentials.username;
    passwordInput.value = pendingCredentials.password;
  }

  // Submit after a short delay (let any validation handlers fire)
  setTimeout(() => {
    const submitBtn =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      document.querySelector('button[name="submit"]') ||
      document.querySelector('.btn-primary');

    if (submitBtn) {
      submitBtn.click();
    } else {
      // Fallback: submit the form
      const form = passwordInput.closest('form');
      if (form) form.submit();
    }

    // Clear credentials from memory immediately
    pendingCredentials = null;
    waiting = false;
  }, 300);
}

// If we were injected into a page that already has the form (no Cloudflare),
// start immediately. Otherwise wait for the message from background.
// We only auto-start if pendingCredentials was set by a race condition.
