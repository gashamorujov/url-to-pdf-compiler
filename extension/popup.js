/**
 * popup.js — v2.0
 * Auto-detects the active tab: IMO site → "Connected" status;
 * Web app tab → "App ready" status; other tabs → generic info.
 * All auth checks are real probes to IMO server (no fake state).
 */

const IMO_ORIGIN = 'https://imo-epublications.org';
const IMO_LOGIN = 'https://imo-epublications.org/registration/signin-or-register.action?signInTarget=%2F';
const WEB_APP_HOSTS = ['localhost', '127.0.0.1', 'gashamorujov.github.io', 'vercel.app', 'netlify.app', 'pages.dev'];

const $ = (id) => document.getElementById(id);
const tabInfoEl = $('tabInfo');
const tabTextEl = $('tabText');
const tabDotEl = tabInfoEl.querySelector('.d');
const statusBox = $('statusBox');
const statusText = $('statusText');
const detailEl = $('detail');
const loginBtn = $('loginBtn');
const webappBtn = $('webappBtn');

function setTabInfo(kind, text) {
  tabInfoEl.style.display = 'flex';
  tabDotEl.className = 'd ' + kind;
  tabTextEl.textContent = text;
}

function setMain(kind, text, detail) {
  statusBox.className = 'tag ' + kind;
  statusText.textContent = text;
  detailEl.textContent = detail || '';
}

function setButtons(login, open) {
  loginBtn.style.display = login ? 'block' : 'none';
  webappBtn.style.display = open ? 'block' : 'none';
}

function classifyTab(url) {
  try {
    const u = new URL(url);
    if (u.origin === IMO_ORIGIN) return 'imo';
    if (WEB_APP_HOSTS.some(h => u.hostname.includes(h) || u.hostname === h)) return 'webapp';
    if (u.protocol === 'chrome:' || u.protocol === 'chrome-extension:') return 'system';
    return 'other';
  } catch {
    return 'unknown';
  }
}

async function refresh() {
  setMain('run', 'Detecting…', '');
  setButtons(false, false);

  // Step 1: Get the active tab to auto-detect context
  let activeTab = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;
  } catch { /* fallback */ }

  if (activeTab && activeTab.url) {
    const kind = classifyTab(activeTab.url);
    if (kind === 'imo') {
      setTabInfo('imo', 'On IMO website — your session is active');
    } else if (kind === 'webapp') {
      setTabInfo('web', 'On web app — paste URLs to load images');
    } else if (kind === 'system') {
      setTabInfo('other', 'On browser internal page');
    } else {
      try {
        const host = new URL(activeTab.url).hostname;
        setTabInfo('other', 'On: ' + host);
      } catch {
        setTabInfo('other', 'Active tab detected');
      }
    }
  }

  // Step 2: Check extension + IMO session status
  try {
    const ping = await chrome.runtime.sendMessage({ type: 'IMO_PING' });
    if (!ping || !ping.ok) throw new Error('Extension background unavailable');

    const auth = await chrome.runtime.sendMessage({ type: 'IMO_CHECK_AUTH' });

    if (auth && auth.authenticated) {
      setMain('ok', 'IMO Connected ✓', 'Authenticated session active — images load with your login.');
      setButtons(false, true);
    } else {
      const reason = (auth && auth.reason) || 'Log in to imo-epublications.org to enable downloads.';
      setMain('no', 'Not logged in to IMO', reason);
      setButtons(true, true);
    }
  } catch (err) {
    setMain('err', 'Extension error', err.message || 'Could not connect to background service.');
    setButtons(false, false);
  }
}

loginBtn.addEventListener('click', () => chrome.tabs.create({ url: IMO_LOGIN }));
webappBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && classifyTab(tab.url) === 'webapp') {
      // Already on web app — just close popup
      window.close();
    } else {
      // Open web app in new tab
      chrome.tabs.create({ url: 'https://gashamorujov.github.io/url-to-pdf-compiler/' });
    }
  });
});

document.addEventListener('DOMContentLoaded', () => void refresh());
