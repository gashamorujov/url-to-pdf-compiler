import { useState } from 'react';
import { loginImo, setConnected } from '../lib/imoExtension';

interface ImoLoginModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ImoLoginModal({ isOpen, onCancel, onSuccess }: ImoLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!isOpen) return null;

  const submit = async () => {
    const user = username.trim();
    if (!user || !password) {
      setError('Please enter username and password');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      setInfo('Opening IMO login page and filling the form…');
      await loginImo(user, password);
      setConnected(true);
      setInfo('IMO login page opened. Once your session is active, click “Re-check”.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed — please open IMO and sign in manually.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-1 text-lg font-bold">Login to IMO</h3>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Your credentials are sent directly to the official IMO sign-in page — never stored or logged by this app.
        </p>

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Username</label>
        <input
          autoFocus
          value={username}
          onChange={(event) => { setUsername(event.target.value); setError(''); }}
          autoComplete="username"
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
        />

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); setError(''); }}
          onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }}
          autoComplete="current-password"
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
        />

        {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}
        {info && <p className="mb-2 text-xs text-emerald-600 dark:text-emerald-400">{info}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Logging in…' : 'Login to IMO'}
          </button>
        </div>
      </div>
    </div>
  );
}
