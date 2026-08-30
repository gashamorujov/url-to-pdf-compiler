import { useEffect, useRef, useState } from 'react';
import { checkImoAuth, openImoLogin, resetExtensionDetection, type ImoAuthResult } from '../lib/imoExtension';

const POLL_INTERVAL_MS = 20_000;

interface ImoAuthBarProps {
  /** When true, forces a "login required" banner regardless of current auth state */
  hasAuthErrors?: boolean;
}

export function ImoAuthBar({ hasAuthErrors = false }: ImoAuthBarProps) {
  const [status, setStatus] = useState<ImoAuthResult>({ available: false, authenticated: null });
  const [checking, setChecking] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    setChecking(true);
    try {
      const result = await checkImoAuth();
      setStatus(result);
    } catch {
      setStatus({ available: false, authenticated: null });
    }
    setChecking(false);
  };

  // Initial probe + polls when not authenticated and extension is present
  useEffect(() => {
    (async () => {
      await refresh();
      setInitializing(false);
    })();
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (status.available && status.authenticated === false) {
      pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status.available, status.authenticated]);

  // Refresh on visibility change (user may return from IMO after login)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && status.available) void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [status.available]);

  const handleInstall = () => {
    window.open(
      'https://github.com/gashamorujov/url-to-pdf-compiler/tree/main/extension#readme',
      '_blank',
      'noopener',
    );
  };

  const handleRefresh = () => {
    resetExtensionDetection();
    setStatus({ available: false, authenticated: null });
    setInitializing(true);
    (async () => {
      await refresh();
      setInitializing(false);
    })();
  };

  // Extension not installed
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

  // Extension installed, authenticated
  if (status.authenticated === true) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ IMO session active</span>
          <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Authenticated images are loaded via the extension.</span>
          <button
            onClick={handleRefresh}
            className="ml-auto rounded px-2 py-1 text-xs text-emerald-600/80 transition hover:bg-emerald-100 dark:text-emerald-400/80 dark:hover:bg-emerald-900/40"
          >
            ↻ Re-check
          </button>
        </div>
      </section>
    );
  }

  // Extension installed, not authenticated (or checking)
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-center gap-3">
        {hasAuthErrors || status.authenticated === false ? (
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            IMO premium login required
          </span>
        ) : (
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Checking IMO session…
          </span>
        )}
        <button
          onClick={openImoLogin}
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
    </section>
  );
}
