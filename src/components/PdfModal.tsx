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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="cyber-panel relative w-full max-w-sm p-6" onClick={(event) => event.stopPropagation()}>
        <span className="cyber-panel-corner tl" />
        <span className="cyber-panel-corner tr" />
        <span className="cyber-panel-corner bl" />
        <span className="cyber-panel-corner br" />
        <h3 className="font-display mb-4 text-lg font-bold uppercase tracking-widest text-cyan-200 glow-cyan">Create PDF</h3>
        <label className="mb-1 block text-xs uppercase tracking-widest text-cyan-400">PDF name</label>
        <input
          autoFocus
          value={filename}
          onChange={(event) => { setFilename(event.target.value); setError(''); }}
          onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
          className="cyber-input mb-1 rounded px-3 py-2 text-sm"
        />
        {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="cyber-btn cyber-btn-ghost">Cancel</button>
          <button onClick={submit} className="cyber-btn cyber-btn-primary">Create PDF</button>
        </div>
      </div>
    </div>
  );
}
