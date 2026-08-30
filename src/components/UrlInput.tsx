import { useRef, useState } from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  detecting: boolean;
}

export function UrlInput({ value, onChange, onAnalyze, detecting }: UrlInputProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const combined = [value.trim(), ...lines].filter(Boolean).join('\n');
    onChange(combined);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <label htmlFor="urls" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
        Image URLs
      </label>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Paste one URL per line. You can mix scrambled page numbers — sorting is automatic. Drop a <code>.txt</code> file here too.
      </p>

      <div
        className={`rounded-lg border-2 border-dashed transition ${
          dragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
            : 'border-gray-300 dark:border-gray-700'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        <textarea
          id="urls"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={'https://example.com/file.pdf?pageNumber=1\nhttps://example.com/file.pdf?pageNumber=3\nhttps://example.com/file.pdf?pageNumber=2'}
          className="h-48 w-full resize-y bg-transparent p-3 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          spellCheck={false}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onAnalyze}
          disabled={detecting || value.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {detecting ? 'Analyzing…' : 'Analyze URLs'}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Import .txt
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
        <span className="text-xs text-gray-400">
          {value.trim().split(/\r?\n/).filter(Boolean).length} URL(s) detected
        </span>
      </div>
    </section>
  );
}
