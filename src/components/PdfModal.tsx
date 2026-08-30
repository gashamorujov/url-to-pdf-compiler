import { useState } from 'react';

interface PdfModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onCreate: (filename: string) => void;
}

export function PdfModal({ isOpen, onCancel, onCreate }: PdfModalProps) {
  const [filename, setFilename] = useState('converted-document');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const submit = () => {
    const trimmed = filename.trim();
    if (!trimmed) {
      setError('Please enter a filename');
      return;
    }
    setError('');
    const name = trimmed.endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    onCreate(name);
    setFilename('converted-document');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">Create PDF</h3>
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">PDF name</label>
        <input
          autoFocus
          value={filename}
          onChange={(event) => { setFilename(event.target.value); setError(''); }}
          onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
        />
        {error && <p className="mb-2 text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={submit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
            Create PDF
          </button>
        </div>
      </div>
    </div>
  );
}
