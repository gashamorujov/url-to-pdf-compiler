import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkImoAuth,
  isConnected,
  logoutImo,
  resetExtensionDetection,
  setConnected,
  type ImoAuthResult,
} from '../lib/imoExtension';
import { ImoLoginModal } from './ImoLoginModal';

const POLL_INTERVAL_MS = 12_000;

interface ImoAuthBarProps {
  hasAuthErrors?: boolean;
}

export function ImoAuthBar({ hasAuthErrors = false }: ImoAuthBarProps) {
  const [status, setStatus] = useState<ImoAuthResult & { connected?: boolean }>({
    available: false,
    authenticated: null,
    connected: isConnected(),
  });
  const [checking, setChecking] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const openSetRef = useRef(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkImoAuth();
      setStatus((current) => (JSON.stringify(current) === JSON.stringify(result) ? current : result));
    } catch {
      setStatus({ available: false, authenticated: null, connected: isConnected() });
    } finally {
      setChecking(false);
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (openSetRef.current) return;
    openSetRef.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (status.available && status.authenticated === false) void refresh();
    }, POLL_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [status.available, status.authenticated, refresh]);

  const handleInstall = () => {
    window.open(
      'https://github.com/gashamorujov/url-to-pdf-compiler/tree/main/extension#readme',
      '_blank',
      'noopener',
    );
  };

  const handleRefresh = () => {
    resetExtensionDetection();
    setStatus({ available: false, authenticated: null, connected: isConnected() });
    setInitializing(true);
    void refresh();
  };

  const handleLoginSuccess = () => {
    setConnected(true);
    setLoginOpen(false);
    void refresh();
  };

  const handleLogout = async () => {
    await logoutImo(); // clears local connected flag only
    setConfirmLogout(false);
    void refresh();
  };

  // Extension not installed / not detected
  if (!status.available && !initializing) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            IMO e-Publications: Extension not detected
          </span>
          <span className="text-xs text-amber-700/80 dark:text-amber-400/80">
            Install the Chrome extension for authenticated downloads.
          </span>
          <button
            onClick={handleInstall}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/60"
          >
            Install Extension
          </button>
          <button
            onClick={handleRefresh}
            className="rounded-lg px-2 py-1 text-xs text-amber-600 transition hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/60"
            title="Re-check for extension"
          >
            ↻
          </button>
        </div>
      </section>
    );
  }

  // Connected / authenticated
  const connected = status.connected || (status.authenticated === true && !hasAuthErrors);
  if (connected) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">🔗 IMO Connected</span>
          <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Authenticated images load automatically.</span>
          <span className="ml-auto flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="rounded px-2 py-1 text-xs text-emerald-600/80 transition hover:bg-emerald-100 dark:text-emerald-400/80 dark:hover:bg-emerald-900/40"
            >
              ↻ Re-check
            </button>
            <button
              onClick={() => setConfirmLogout(true)}
              className="rounded border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            >
              Logout
            </button>
          </span>
        </div>

        {confirmLogout && (
          <div className="mt-3 rounded-lg border border-emerald-200 p-3 dark:border-emerald-800">
            <p className="mb-2 text-xs text-emerald-700 dark:text-emerald-400">
              Logout removes this app's IMO connection state only. Your IMO account session itself stays active in the browser.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleLogout()}
                className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-500"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // Not authenticated
  const needsLogin = hasAuthErrors || status.authenticated === false;
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-center gap-3">
        {needsLogin ? (
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">IMO premium login required</span>
        ) : (
          <span className="text-sm text-amber-700 dark:text-amber-400">Checking IMO session…</span>
        )}
        <button
          onClick={() => setLoginOpen(true)}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Login to IMO
        </button>
        <button
          onClick={handleRefresh}
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/60"
          disabled={checking}
        >
          {checking ? 'Checking…' : '↻ Re-check'}
        </button>
      </div>

      <ImoLoginModal isOpen={loginOpen} onCancel={() => setLoginOpen(false)} onSuccess={handleLoginSuccess} />
    </section>
  );
}
