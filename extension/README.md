# IMO Authenticated Bridge — Chrome Extension

## What this does

This Chrome extension lets the **URL-to-PDF Compiler** web app download premium
images from `imo-epublications.org` using **your own already-authenticated
browser session** — the same session you use when browsing IMO normally.

### Security (non-negotiable)

| Rule | Enforced |
|---|---|
| Extension reads your IMO cookies **only** via `host_permissions` | ✅ |
| Cookies / tokens are **never forwarded** to the web app or any server | ✅ |
| Passwords are **never read or stored** | ✅ |
| Auth data is **never stored** in localStorage, IndexedDB, or any external database | ✅ |
| 401/403 responses are reported as **"login required"** — the app never bypasses access control | ✅ |

## Install (Developer mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder in this repo
4. Pin the extension icon for easy access

## Web app compatibility

The extension's content script is injected on these origins:

- `http://localhost/*` (local dev)
- `https://*.vercel.app/*`
- `https://*.netlify.app/*`
- `https://*.github.io/*`

If you deploy to a custom domain, add its URL pattern to the
`content_scripts.matches` array in `manifest.json`.

## How it works (data flow)

```
┌────────────┐    window.postMessage    ┌─────────────────┐
│  Web App   │ ──────────────────────▶  │ Content Bridge  │
│  (React)   │ ◀────────────────────── │  (content.js)   │
└────────────┘                          └────────┬────────┘
                                                 │ chrome.runtime.sendMessage
                                                 ▼
                                        ┌─────────────────┐
                                        │ Background SW    │
                                        │ (background.js)  │
                                        └────────┬────────┘
                                                 │ fetch() with session
                                                 ▼
                                        imo-epublications.org
```

1. The web app sends a request via `window.postMessage` to the content bridge
2. The content bridge forwards it to the background service worker via
   `chrome.runtime.sendMessage`
3. The background fetches `imo-epublications.org` with `credentials: 'include'`
   — Chrome attaches your cookies automatically (no credentials are read)
4. The response is returned up the chain — **your cookies never leave Chrome**

## Limitations

- The extension must be installed **and** you must be logged into `imo-epublications.org`
  in the same Chrome profile
- If you're not logged in, the web app shows "IMO premium login required" and
  a **Login to IMO** button that opens the official IMO sign-in page
- The extension does **not** bypass DRM, subscription walls, or any access control

## License

Same as the parent project.

## Session detection

Login status is detected by checking for IMO session cookies (`JSESSIONID`,
`AWSALB`) in the browser. The extension only checks **whether** a session cookie
exists — it never reads, copies, or sends the cookie value anywhere. When you
log in or log out of `imo-epublications.org`, the web app picks up the change
automatically (it detects the cookie presence) and refreshes its status.

The content bridge is injected on **all origins** (`<all_urls>`) so the tool
works on any deployed domain. The bridge is inert by design — it only relays
messages that carry the `__imo_bridge__` marker from the page to the extension
background, and never inspects page content.
