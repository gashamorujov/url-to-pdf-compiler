/**
 * popup.js — renders the IMO session status and Login / Open actions.
 * All messages are sent to the background service worker which performs the
 * real auth probe. No credentials are handled here.
 */

const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const detailEl = document.getElementById('detail');
const loginBtn = document.getElementById('loginBtn');
const openBtn = document.getElementById('openBtn');

const IMO_LOGIN_URL = 'https://imo-epublications.org/registration/signin-or-register.action?signInTarget=%2F';

function setState(kind, text, detail, showLogin, showOpen) {
  statusBox.className = 'status ' + kind;
  statusText.textContent = text;
  detailEl.textContent = detail || '';
  loginBtn.style.display = showLogin ? 'block' : 'none';
  openBtn.style.display = showOpen ? 'block' : 'none';
}

async function refresh() {
  setState('checking', 'Checking IMO session…', '', false, false);
  try {
    const res = await chrome.runtime.sendMessage({ type: 'IMO_PING' });
    if (!res || !res.ok) throw new Error('extension unavailable');
    const auth = await chrome.runtime.sendMessage({ type: 'IMO_CHECK_AUTH' });
    if (auth && auth.authenticated) {
      setState(
        'connected',
        'IMO Connected',
        'Your authenticated IMO session is active. The web app can download your images.',
        false,
        true,
      );
    } else {
      setState(
        'disconnected',
        'Not logged in to IMO',
        auth && auth.reason ? auth.reason : 'Please log in to imo-epublications.org to enable authenticated downloads.',
        true,
        true,
      );
    }
  } catch (error) {
    setState(
      'error',
      'Extension error',
      error && error.message ? error.message : 'Failed to check IMO session.',
      false,
      false,
    );
  }
}

loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: IMO_LOGIN_URL });
});

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/gashamorujov/url-to-pdf-compiler' });
});

document.addEventListener('DOMContentLoaded', () => void refresh());
